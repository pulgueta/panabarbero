import { createFileRoute, redirect } from "@tanstack/react-router";
import type { FC } from "react";
import { Suspense } from "react";
import {
  DashboardPage,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { DashboardPending } from "@/components/dashboard/dashboard-pending";
import { BarberScheduleCard } from "@/components/profile/barber-schedule-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import {
  barberByUserIdQueryOptions,
  barberScheduleQueryOptions,
} from "@/hooks/use-barbershop-members";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/schedule/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Mi horario" },
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  loader: async (opts) => {
    const userId = opts.context.userId;
    const roles = opts.context.dashboardRoles;

    // Read-only self-schedule view for the barber role. Owners and staff manage
    // schedules per barber under Equipo → Barberos, so keep this scoped to the
    // barber who has no other place to see their own hours.
    if (!userId || !roles?.roles?.includes("barber")) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }

    const member = await opts.context.queryClient.ensureQueryData(
      barberByUserIdQueryOptions(userId),
    );

    if (member?._id) {
      await opts.context.queryClient.ensureQueryData(
        barberScheduleQueryOptions(member._id),
      );
    }
  },
});

const FALLBACK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const ScheduleFallback: FC = () => (
  <Card className="w-full">
    <CardContent>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {FALLBACK_DAYS.map((day) => (
          <Skeleton key={day} className="h-20 rounded-lg" />
        ))}
      </div>
    </CardContent>
  </Card>
);

function RouteComponent() {
  const userId = Route.useRouteContext({
    select: (context) => context.userId,
  });

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Mi horario"
          description="Consulta tu horario de trabajo semanal. Contacta al dueño para solicitar cambios."
        />
      </DashboardPageHeader>

      <DashboardPageContent>
        <Suspense fallback={<ScheduleFallback />}>
          <BarberScheduleCard userId={userId ?? ""} hideHeader />
        </Suspense>
      </DashboardPageContent>
    </DashboardPage>
  );
}
