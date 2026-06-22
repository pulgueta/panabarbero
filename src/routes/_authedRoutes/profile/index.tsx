/** biome-ignore-all lint/style/noNonNullAssertion: We need to assert non-null values because the hooks return undefined if the data is not loaded */

import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
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
import {
  lastReadQueryOptions,
  notificationsPageQueryOptions,
  recentNotificationsQueryOptions,
  unreadNotificationsCountQueryOptions,
  unreadNotificationsPageQueryOptions,
} from "@/hooks/use-notifications";
import { profileQueryOptions, useProfile } from "@/hooks/use-profile";
import {
  myReviewsNeedingAttentionCountQueryOptions,
  useMyReviewsNeedingAttentionCount,
} from "@/hooks/use-reviews";
import { servicesByIdsQueryOptions } from "@/hooks/use-services";
import { useSession } from "@/hooks/use-session";

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
const NotificationsTab = lazy(() =>
  import("@/components/profile/notifications-tab").then((mod) => ({
    default: mod.NotificationsTab,
  })),
);
const ReviewsTab = lazy(() =>
  import("@/components/profile/reviews-tab").then((mod) => ({
    default: mod.ReviewsTab,
  })),
);

type ProfileTabValue =
  | "notifications"
  | "account"
  | "appointments"
  | "reviews"
  | "danger"
  | "plans";

const tabs = {
  notifications: {
    label: "Notificaciones",
    value: "notifications",
  },
  account: {
    label: "Perfil",
    value: "account",
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
    "notifications",
    "account",
    "appointments",
    "reviews",
    "plans",
    "danger",
  ]),
});

const EMPTY_APPOINTMENTS: never[] = [];

export const Route = createFileRoute("/_authedRoutes/profile/")({
  component: ProfilePage,
  pendingComponent: LoadingComponent,
  validateSearch: searchSchema,
  ssr: "data-only",
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  loader: async ({ context }) => {
    const userId = context.userId;

    if (userId) {
      // Spine (single parallel layer): everything read at the page level —
      // profile + the customer's own appointments, the role flags (suspense)
      // and owner roles/barbershop that gate the tab list. The component reads
      // roles and the owner barbershop via useQuery for every user, so priming
      // them here is never wasted.
      const [appointments, barbershop] = await Promise.all([
        context.queryClient.ensureQueryData(
          appointmentsByUserQueryOptions(userId),
        ),
        context.queryClient.ensureQueryData(
          barbershopByOwnerIdQueryOptions(userId),
        ),
        context.queryClient.ensureQueryData(isBarberQueryOptions(userId)),
        context.queryClient.ensureQueryData(isOwnerQueryOptions(userId)),
        context.queryClient.ensureQueryData(isStaffQueryOptions(userId)),
        context.queryClient.ensureQueryData(profileQueryOptions(userId)),
        context.queryClient.ensureQueryData(
          barbershopMemberRolesQueryOptions(userId),
        ),
      ]);

      // Quota usage only feeds an owner tab — defer it.
      if (barbershop) {
        void context.queryClient.prefetchQuery(
          getBarbershopQuotaUsageQueryOptions(barbershop._id),
        );
      }

      // Tab-specific data — every consumer lives inside a <Suspense>-wrapped
      // lazy tab, so prime the cache without blocking the shell or default tab.
      void context.queryClient.prefetchQuery(getPricingPlansQueryOptions());
      void context.queryClient.prefetchQuery(getSubscriptionQueryOptions());
      void context.queryClient.prefetchQuery(getExtraCreditsQueryOptions());
      void context.queryClient.prefetchQuery(
        unreadNotificationsCountQueryOptions(),
      );
      void context.queryClient.prefetchQuery(lastReadQueryOptions());
      void context.queryClient.prefetchQuery(
        notificationsPageQueryOptions({ cursor: null, numItems: 20 }),
      );
      void context.queryClient.prefetchQuery(
        unreadNotificationsPageQueryOptions({ cursor: null, numItems: 20 }),
      );
      void context.queryClient.prefetchQuery(recentNotificationsQueryOptions());
      void context.queryClient.prefetchQuery(
        myReviewsNeedingAttentionCountQueryOptions(),
      );

      if (appointments) {
        void context.queryClient.prefetchQuery(
          servicesByIdsQueryOptions(
            // @ts-expect-error - appointments is defined
            appointments.page.map((appointment) => appointment.serviceId),
          ),
        );
      }
    }
  },
});

function ProfilePage() {
  const navigate = Route.useNavigate();
  const { tab } = Route.useSearch();

  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([]);

  const haptics = useWebHaptics();

  const { data: user } = useSession();
  const { data: isBarber } = useIsBarber(user?.id!);
  const { data: isOwner } = useIsOwner(user?.id!);
  const { data: isStaff } = useIsStaff(user?.id!);
  const { data: rolesData } = useBarbershopMemberRoles(user?.id!);
  const { data: barbershop } = useBarbershopByOwnerId(user?.id!);
  const { data: appointments, isFetching: isFetchingAppointments } =
    useAppointmentsByUser(user?.id!, cursor);
  const { data: profile } = useProfile(user?.id!);
  const { data: reviewsNeedingAttention } = useMyReviewsNeedingAttentionCount();

  const onTabChange = (value: string) => {
    haptics.trigger("light");
    navigate({
      to: "/profile",
      search: { tab: value as ProfileTabValue },
    });
  };

  const onNextPage = useCallback(() => {
    if (!("continueCursor" in appointments)) {
      return;
    }

    setCursorStack((prev) => [...prev, cursor]);
    setCursor(appointments.continueCursor);
  }, [appointments, cursor]);

  const onPreviousPage = useCallback(() => {
    setCursorStack((prev) => {
      const updated = [...prev];
      const previousCursor = updated.pop() ?? null;
      setCursor(previousCursor);
      return updated;
    });
  }, []);

  const tabsToRender = useMemo(() => {
    // Notificaciones sits first so the bell popover lands the user on a familiar
    // left-most tab, while Perfil stays the default for direct /profile visits.
    const base = [tabs.notifications, tabs.account, tabs.reviews];

    // Owners see Plans tab
    if (rolesData?.isOwner) {
      base.push(tabs.plans);
    }

    // Non-barber, non-owner, non-staff users (customers) see their appointment history
    if (!isBarber && !isOwner && !isStaff) {
      base.push(tabs.appointments);
    }

    // All authenticated users can delete their account
    base.push(tabs.danger);

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
                className="gap-1.5 text-xs sm:min-w-max sm:text-sm"
              >
                {tabOption.label}
                {tabOption.value === tabs.reviews.value &&
                reviewsNeedingAttention ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 font-medium text-[11px] text-primary-foreground tabular-nums">
                    {reviewsNeedingAttention > 99
                      ? "99+"
                      : reviewsNeedingAttention}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>

          <Suspense fallback={<ProfileTabSkeleton />}>
            <TabsContent value={tabs.notifications.value} className="pt-2">
              <NotificationsTab />
            </TabsContent>
          </Suspense>

          <Suspense fallback={<ProfileTabSkeleton />}>
            <TabsContent value={tabs.account.value} className="pt-2">
              <AccountTab
                profile={profile!}
                isBarber={isBarber || isOwner}
                userId={user?.id!}
              />
            </TabsContent>
          </Suspense>

          <Suspense fallback={<ProfileTabSkeleton />}>
            <TabsContent value={tabs.danger.value} className="pt-2">
              <DangerTab
                barbershopId={barbershop?._id}
                isOwner={!!rolesData?.isOwner}
                isBarber={!!isBarber}
                isStaff={!!isStaff}
              />
            </TabsContent>
          </Suspense>

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
                  appointments={appointments?.page ?? EMPTY_APPOINTMENTS}
                  hasNextPage={Boolean(
                    appointments &&
                      !appointments.isDone &&
                      appointments.continueCursor &&
                      appointments.page?.length >= 9,
                  )}
                  onNextPage={onNextPage}
                  onPreviousPage={onPreviousPage}
                  canGoPrevious={cursorStack.length > 0}
                  isFetching={isFetchingAppointments}
                  isBarber={isBarber}
                />
              )}
            </TabsContent>
          </Suspense>

          <Suspense fallback={<ProfileTabSkeleton />}>
            <TabsContent value={tabs.reviews.value} className="pt-2">
              <ReviewsTab />
            </TabsContent>
          </Suspense>
        </Tabs>
      </div>
    </BorderContainer>
  );
}
