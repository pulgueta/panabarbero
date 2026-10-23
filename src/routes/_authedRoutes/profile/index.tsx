/* oxlint-disable typescript/no-non-null-assertion -- the authed layout guarantees a session; the hooks return undefined until the data loads */

import { noop, useQuery } from "@tanstack/react-query";
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
import { myReviewsNeedingAttentionCountQueryOptions } from "@/hooks/use-reviews";
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
        context.queryClient.query({
          ...appointmentsByUserQueryOptions(userId),
          staleTime: "static",
        }),
        context.queryClient.query({
          ...barbershopByOwnerIdQueryOptions(userId),
          staleTime: "static",
        }),
        context.queryClient.query({
          ...isBarberQueryOptions(userId),
          staleTime: "static",
        }),
        context.queryClient.query({
          ...isOwnerQueryOptions(userId),
          staleTime: "static",
        }),
        context.queryClient.query({
          ...isStaffQueryOptions(userId),
          staleTime: "static",
        }),
        context.queryClient.query({
          ...profileQueryOptions(userId),
          staleTime: "static",
        }),
        context.queryClient.query({
          ...barbershopMemberRolesQueryOptions(userId),
          staleTime: "static",
        }),
      ]);

      // Quota usage only feeds an owner tab — defer it.
      if (barbershop) {
        void context.queryClient
          .query(getBarbershopQuotaUsageQueryOptions(barbershop._id))
          .catch(noop);
      }

      // Tab-specific data — every consumer lives inside a <Suspense>-wrapped
      // lazy tab, so prime the cache without blocking the shell or default tab.
      void context.queryClient.query(getExtraCreditsQueryOptions()).catch(noop);
      void context.queryClient
        .query(unreadNotificationsCountQueryOptions())
        .catch(noop);
      void context.queryClient.query(lastReadQueryOptions()).catch(noop);
      void context.queryClient
        .query(notificationsPageQueryOptions({ cursor: null, numItems: 20 }))
        .catch(noop);
      void context.queryClient
        .query(
          unreadNotificationsPageQueryOptions({ cursor: null, numItems: 20 }),
        )
        .catch(noop);
      void context.queryClient
        .query(recentNotificationsQueryOptions())
        .catch(noop);
      void context.queryClient
        .query(myReviewsNeedingAttentionCountQueryOptions())
        .catch(noop);

      if (appointments) {
        void context.queryClient
          .query(
            servicesByIdsQueryOptions(
              appointments.page.map((appointment) => appointment.serviceId),
            ),
          )
          .catch(noop);
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
  // Non-suspense read: the loader only *streams* this badge count
  // (`void query().catch(noop)`), so consuming it with `useSuspenseQuery` would let a
  // non-critical tab badge suspend the whole profile shell on slow paths. Plain
  // `useQuery` degrades gracefully — shell paints immediately, badge fills in.
  const { data: reviewsNeedingAttention = 0 } = useQuery(
    myReviewsNeedingAttentionCountQueryOptions(),
  );

  const onTabChange = (value: string) => {
    void haptics.trigger("light");

    const nextTab = searchSchema.shape.tab.safeParse(value);

    if (!nextTab.success) {
      return;
    }

    void navigate({
      to: "/profile",
      search: { tab: nextTab.data },
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
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 font-medium text-xs text-primary-foreground tabular-nums">
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
                isBarber={isBarber}
                isStaff={isStaff}
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
