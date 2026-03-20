/** biome-ignore-all lint/style/noNonNullAssertion: We need to assert non-null values because the hooks return undefined if the data is not loaded */

import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { useWebHaptics } from "web-haptics/react";
import { z } from "zod";

import { DashboardHeaderSkeleton } from "@/components/barbershops/dashboard-header.skeleton";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cacheTime } from "@/config/cache";
import {
  barbershopByOwnerIdQueryOptions,
  useBarbershopByOwnerId,
} from "@/hooks/barbershop/use-barbershop";
import {
  barbershopMemberRolesQueryOptions,
  useBarbershopMemberRoles,
} from "@/hooks/barbershop/use-barbershop-member";
import {
  getBarbershopQuotaUsageQueryOptions,
  getExtraCreditsQueryOptions,
} from "@/hooks/billing/use-credits";
import {
  getPricingPlansQueryOptions,
  getSubscriptionQueryOptions,
} from "@/hooks/billing/use-pricing";
import {
  appointmentsByUserQueryOptions,
  useAppointmentsByUser,
} from "@/hooks/use-appointments";
import {
  isBarberQueryOptions,
  isOwnerQueryOptions,
  isStaffQueryOptions,
  useIsBarber,
  useIsOwner,
  useIsStaff,
} from "@/hooks/use-barbershop-members";
import { profileQueryOptions, useProfile } from "@/hooks/use-profile";
import { servicesByIdsQueryOptions } from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

const DashboardHeader = lazy(() =>
  import("@/components/barbershops/dashboard-header").then((module) => ({
    default: module.DashboardHeader,
  })),
);
const AccountTab = lazy(() =>
  import("@/components/profile/account-tab").then((mod) => ({
    default: mod.AccountTab,
  })),
);
const AppointmentsTab = lazy(() =>
  import("@/components/profile/appointments-tab").then((mod) => ({
    default: mod.AppointmentsTab,
  })),
);
const DangerTab = lazy(() =>
  import("@/components/profile/danger-tab").then((mod) => ({
    default: mod.DangerTab,
  })),
);
const PlansTab = lazy(() =>
  import("@/components/profile/plans-tab").then((mod) => ({
    default: mod.PlansTab,
  })),
);
const SecurityTab = lazy(() =>
  import("@/components/profile/security-tab").then((mod) => ({
    default: mod.SecurityTab,
  })),
);

type ProfileTabValue =
  | "account"
  | "security"
  | "appointments"
  | "reviews"
  | "danger"
  | "plans";

const tabs = {
  account: {
    label: "Perfil",
    value: "account",
  },
  security: {
    label: "Seguridad",
    value: "security",
  },
  appointments: {
    label: "Citas",
    value: "appointments",
  },
  reviews: {
    label: "Reseñas",
    value: "reviews",
  },
  plans: {
    label: "Planes",
    value: "plans",
  },
  danger: {
    label: "Peligro",
    value: "danger",
  },
};

const searchSchema = z.object({
  tab: z.enum([
    "account",
    "security",
    "appointments",
    "reviews",
    "plans",
    "danger",
  ]),
});

export const Route = createFileRoute("/_authedRoutes/profile/")({
  component: ProfilePage,
  pendingComponent: LoadingComponent,
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      const [isBarber, isOwner, isStaff] = await Promise.all([
        context.queryClient.ensureQueryData(isBarberQueryOptions(user.userId)),
        context.queryClient.ensureQueryData(isOwnerQueryOptions(user.userId)),
        context.queryClient.ensureQueryData(isStaffQueryOptions(user.userId)),
      ]);

      if (isBarber || isOwner || isStaff) {
        await context.queryClient.ensureQueryData(
          barbershopMemberRolesQueryOptions(user.userId),
        );
        const barbershop = await context.queryClient.ensureQueryData(
          barbershopByOwnerIdQueryOptions(user.userId),
        );
        if (barbershop) {
          await context.queryClient.ensureQueryData(
            getBarbershopQuotaUsageQueryOptions(barbershop._id),
          );
        }
      }

      const [appointments] = await Promise.all([
        context.queryClient.ensureQueryData(
          appointmentsByUserQueryOptions(user.userId),
        ),
        context.queryClient.ensureQueryData(profileQueryOptions(user.userId)),
        context.queryClient.ensureQueryData(getPricingPlansQueryOptions()),
        context.queryClient.ensureQueryData(getSubscriptionQueryOptions()),
        context.queryClient.ensureQueryData(getExtraCreditsQueryOptions()),
      ]);

      if (appointments) {
        await context.queryClient.ensureQueryData(
          servicesByIdsQueryOptions(
            // @ts-expect-error - appointments is defined
            appointments.page.map((appointment) => appointment.serviceId),
          ),
        );
      }
    }
  },
  ssr: "data-only",
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
});

function ProfilePage() {
  const navigate = Route.useNavigate();
  const { tab } = Route.useSearch();

  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([]);

  const haptics = useWebHaptics();

  const { data: user } = useSession();
  const { data: isBarber } = useIsBarber(user?.userId!);
  const { data: isOwner } = useIsOwner(user?.userId!);
  const { data: isStaff } = useIsStaff(user?.userId!);
  const { data: rolesData } = useBarbershopMemberRoles(user?.userId!);
  const { data: barbershop } = useBarbershopByOwnerId(user?.userId!);
  const { data: appointments, isFetching: isFetchingAppointments } =
    useAppointmentsByUser(user?.userId!, cursor);
  const { data: profile } = useProfile(user?.userId!);

  const onTabChange = (value: string) => {
    haptics.trigger("light");
    navigate({
      to: "/profile",
      search: { tab: value as ProfileTabValue },
    });
  };

  const tabsToRender = useMemo(() => {
    const base = [tabs.account, tabs.security];

    // Owners (whether or not they're barbers) see Plans and Danger tabs
    if (rolesData?.isOwner) {
      base.push(tabs.plans);
      base.push(tabs.danger);
    }

    // Non-barber, non-owner, non-staff users (customers) see their appointment history
    if (!isBarber && !isOwner && !isStaff) {
      base.push(tabs.appointments);
    }

    return base;
  }, [isBarber, isOwner, isStaff, rolesData?.isOwner]);

  return (
    <BorderContainer>
      <Suspense fallback={<DashboardHeaderSkeleton />}>
        <DashboardHeader
          title="Perfil"
          description={`Gestiona tu perfil ${!isBarber && !isOwner && !isStaff ? "y tus citas." : ""}`}
        />
      </Suspense>

      <div className="flex flex-col items-start justify-center gap-4">
        <Tabs
          value={tab ?? tabs.account.value}
          className="min-w-full"
          orientation="horizontal"
          onValueChange={onTabChange}
        >
          <TabsList>
            {tabsToRender.map((tabOption) => (
              <TabsTrigger
                key={tabOption.value}
                value={tabOption.value}
                className="text-sm sm:min-w-24"
              >
                {tabOption.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <Suspense fallback={<ProfileTabSkeleton />}>
            <TabsContent value={tabs.account.value} className="pt-2">
              <AccountTab
                profile={profile!}
                isBarber={isBarber || isOwner}
                userId={user?.userId!}
              />
            </TabsContent>
          </Suspense>

          <Suspense fallback={<ProfileTabSkeleton />}>
            <TabsContent value={tabs.security.value} className="pt-2">
              <SecurityTab />
            </TabsContent>
          </Suspense>

          {rolesData?.isOwner && (
            <Suspense fallback={<ProfileTabSkeleton />}>
              <TabsContent value={tabs.danger.value} className="pt-2">
                <DangerTab barbershopId={barbershop?._id} />
              </TabsContent>
            </Suspense>
          )}

          {rolesData?.isOwner && (
            <Suspense fallback={<ProfileTabSkeleton />}>
              <TabsContent value={tabs.plans.value} className="pt-2">
                <PlansTab />
              </TabsContent>
            </Suspense>
          )}

          <Suspense fallback={<ProfileTabSkeleton />}>
            <TabsContent value={tabs.appointments.value} className="pt-2">
              {"page" in appointments && (
                <AppointmentsTab
                  appointments={appointments?.page ?? []}
                  hasNextPage={Boolean(
                    appointments &&
                      !appointments.isDone &&
                      appointments.continueCursor &&
                      appointments.page?.length >= 9,
                  )}
                  onNextPage={() => {
                    setCursorStack((prev) => [...prev, cursor]);
                    setCursor(appointments.continueCursor);
                  }}
                  onPreviousPage={() => {
                    setCursorStack((prev) => {
                      const updated = [...prev];
                      const previousCursor = updated.pop() ?? null;
                      setCursor(previousCursor);
                      return updated;
                    });
                  }}
                  canGoPrevious={cursorStack.length > 0}
                  isFetching={isFetchingAppointments}
                  isBarber={isBarber}
                />
              )}
            </TabsContent>
          </Suspense>

          {/* <Activity mode={activeTab === "reviews" ? "visible" : "hidden"}>
            <TabsContent value="reviews" className="pt-2">
              <ReviewsTab
                reviews={reviews}
                appointments={appointments}
                // @ts-expect-error - barbershops is defined
                barbershops={barbershops}
              />
            </TabsContent>
          </Activity> */}
        </Tabs>
      </div>
    </BorderContainer>
  );
}
