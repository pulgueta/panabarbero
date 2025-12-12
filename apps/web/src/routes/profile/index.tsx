/** biome-ignore-all lint/style/noNonNullAssertion: We need to assert non-null values because the hooks return undefined if the data is not loaded */

import { signOut } from "@panabarbero/convex/auth";
import { createFileRoute } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Activity, Suspense, useMemo, useState } from "react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { AccountTab } from "@/components/profile/account-tab";
import { AppointmentsTab } from "@/components/profile/appointments-tab";
import { DangerTab } from "@/components/profile/danger-tab";
import { SecurityTab } from "@/components/profile/security-tab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  barbershopByOwnerIdQueryOptions,
  useBarbershopByOwnerId,
} from "@/hooks/barbershop/use-barbershop";
import {
  appointmentsByUserQueryOptions,
  useAppointmentsByUser,
} from "@/hooks/use-appointments";
import {
  isBarberQueryOptions,
  useIsBarber,
} from "@/hooks/use-barbershop-members";
import { profileQueryOptions, useProfile } from "@/hooks/use-profile";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

type ProfileTabValue =
  | "account"
  | "security"
  | "appointments"
  | "reviews"
  | "danger";

type ProfileSearch = {
  tab: ProfileTabValue;
};

const tabs = {
  account: {
    label: "Cuenta",
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
  danger: {
    label: "Zona de peligro",
    value: "danger",
  },
};

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
  pendingComponent: LoadingComponent,
  validateSearch: (search: Record<string, ProfileTabValue>): ProfileSearch => {
    return {
      tab: search.tab,
    };
  },
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      await context.queryClient.ensureQueryData(
        appointmentsByUserQueryOptions(user.userId, null),
      );
      await context.queryClient.ensureQueryData(
        profileQueryOptions(user.userId),
      );
      await context.queryClient.ensureQueryData(
        isBarberQueryOptions(user.userId),
      );
      await context.queryClient.ensureQueryData(
        barbershopByOwnerIdQueryOptions(user.userId),
      );
    }
  },
});

function ProfilePage() {
  const navigate = Route.useNavigate();
  const { tab } = Route.useSearch();

  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([]);

  const { data: user } = useSession();
  const { data: isBarber } = useIsBarber(user?.userId!);
  const { data: barbershop } = useBarbershopByOwnerId(user?.userId!);
  const {
    data: appointments,
    isLoading: isLoadingAppointments,
    isFetching: isFetchingAppointments,
  } = useAppointmentsByUser(user?.userId!, cursor);
  const { data: profile, isLoading: isLoadingProfile } = useProfile(
    user?.userId!,
  );

  const onTabChange = (value: string) => {
    navigate({ to: "/profile", search: { tab: value as ProfileTabValue } });
  };

  const handleSignOut = async () => {
    await signOut();

    throw navigate({ to: "/login", replace: true });
  };

  const tabsToRender = useMemo(() => {
    const base = [tabs.appointments, tabs.account, tabs.security];
    if (isBarber) {
      base.push(tabs.danger);
    }
    return base;
  }, [isBarber]);

  return (
    <BorderContainer className="space-y-6">
      <div className="flex flex-col items-start justify-center gap-4">
        <Button
          variant="destructive"
          onClick={handleSignOut}
          className="min-w-24"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </Button>
        <Tabs
          defaultValue={
            tab ?? (isBarber ? tabs.account.value : tabs.appointments.value)
          }
          className="min-w-full"
          onValueChange={onTabChange}
        >
          <TabsList>
            {tabsToRender.map((tabOption) => (
              <TabsTrigger
                key={tabOption.value}
                value={tabOption.value}
                className="min-w-24 md:min-w-32 md:max-w-40"
              >
                {tabOption.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <Suspense fallback={<ProfileTabSkeleton />}>
            <Activity
              mode={
                tab === tabs.account.value && !isLoadingProfile
                  ? "visible"
                  : "hidden"
              }
            >
              <TabsContent value={tabs.account.value} className="pt-2">
                <AccountTab
                  profile={profile}
                  isBarber={isBarber}
                  userId={user?.userId!}
                />
              </TabsContent>
            </Activity>
          </Suspense>

          <Suspense fallback={<ProfileTabSkeleton />}>
            <Activity
              mode={
                tab === tabs.security.value && !isLoadingProfile
                  ? "visible"
                  : "hidden"
              }
            >
              <TabsContent value={tabs.security.value} className="pt-2">
                <SecurityTab profile={profile} />
              </TabsContent>
            </Activity>
          </Suspense>

          {isBarber && (
            <Suspense fallback={<ProfileTabSkeleton />}>
              <Activity
                mode={
                  tab === tabs.danger.value && !isLoadingProfile
                    ? "visible"
                    : "hidden"
                }
              >
                <TabsContent value={tabs.danger.value} className="pt-2">
                  <DangerTab barbershopId={barbershop?._id} />
                </TabsContent>
              </Activity>
            </Suspense>
          )}

          <Suspense fallback={<ProfileTabSkeleton />}>
            <Activity
              mode={
                tab === tabs.appointments.value && !isLoadingAppointments
                  ? "visible"
                  : "hidden"
              }
            >
              <TabsContent value={tabs.appointments.value} className="pt-2">
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
              </TabsContent>
            </Activity>
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
