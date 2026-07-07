import type { Barbershop } from "@convex/schema";
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { FC } from "react";
import { Suspense } from "react";

import { AppointmentsTrendChart } from "@/components/analytics/appointments-trend-chart";
import { RevenueTrendChart } from "@/components/analytics/revenue-trend-chart";
import { TopBreakdownChart } from "@/components/analytics/top-breakdown-chart";
import { WeekdayChart } from "@/components/analytics/weekday-chart";
import {
  DashboardPage,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
  DashboardPageStats,
} from "@/components/dashboard/dashboard-page";
import { DashboardPending } from "@/components/dashboard/dashboard-pending";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import {
  appointmentsTrendQueryOptions,
  operationsBreakdownQueryOptions,
  useAppointmentsTrend,
  useOperationsBreakdown,
} from "@/hooks/use-dashboard-analytics";
import { formatCurrency } from "@/lib/utils";

const ANALYTICS_DESCRIPTION =
  "Analiza el desempeño de tu barbería: citas, ingresos, equipo y servicios.";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/analytics/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Analíticas" },
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async (opts) => {
    const barbershop = opts.context.dashboardBarbershop;
    const roles = opts.context.dashboardRoles;

    // Analytics are management-only — barbers (and non-members) land on Citas.
    if (!roles?.isOwner && !roles?.isStaff) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }

    if (barbershop?._id) {
      // Spine: the breakdown powers the KPI strip + comparison charts.
      await opts.context.queryClient.ensureQueryData(
        operationsBreakdownQueryOptions(barbershop._id),
      );

      // Leaf: the monthly trend charts prime without blocking.
      void opts.context.queryClient.prefetchQuery(
        appointmentsTrendQueryOptions(barbershop._id),
      );
    }
  },
});

const NoBarbershop: FC = () => (
  <Empty>
    <EmptyHeader>
      <EmptyTitle>No tienes una barbería asociada.</EmptyTitle>
      <EmptyDescription>
        Crea o únete a una barbería para ver sus analíticas.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

interface AnalyticsBodyProps {
  barbershopId: Barbershop["_id"];
}

const AnalyticsBody: FC<AnalyticsBodyProps> = ({ barbershopId }) => {
  const { data: breakdown } = useOperationsBreakdown(barbershopId);
  const { data: trend, isPending: isTrendPending } =
    useAppointmentsTrend(barbershopId);

  const weeklyAverage =
    Math.round((breakdown.totals.completed / (breakdown.days / 7)) * 10) / 10;

  return (
    <div className="space-y-6">
      <DashboardPageStats>
        <Card>
          <CardHeader>
            <CardDescription>Citas completadas (90 días)</CardDescription>
            <CardTitle className="tabular-nums">
              {breakdown.totals.completed.toLocaleString("es-CO")}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Ingresos estimados (90 días)</CardDescription>
            <CardTitle className="tabular-nums">
              {formatCurrency(breakdown.totals.revenue)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Promedio semanal de citas</CardDescription>
            <CardTitle className="tabular-nums">
              {weeklyAverage.toLocaleString("es-CO")}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Inasistencias (90 días)</CardDescription>
            <CardTitle className="tabular-nums">
              {breakdown.totals.noShows.toLocaleString("es-CO")}
            </CardTitle>
          </CardHeader>
        </Card>
      </DashboardPageStats>

      <div className="grid gap-4 lg:grid-cols-2">
        {isTrendPending ? (
          <>
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </>
        ) : (
          <>
            <AppointmentsTrendChart data={trend ?? []} />
            <RevenueTrendChart data={trend ?? []} />
          </>
        )}

        <TopBreakdownChart
          title="Citas por barbero"
          description={`Top 5 en los últimos ${breakdown.days} días`}
          rows={breakdown.perBarber}
          emptyMessage="Aún no hay citas completadas por barbero."
        />
        <TopBreakdownChart
          title="Servicios más solicitados"
          description={`Top 5 en los últimos ${breakdown.days} días`}
          rows={breakdown.perService}
          emptyMessage="Aún no hay servicios completados."
        />

        <div className="lg:col-span-2">
          <WeekdayChart byWeekday={breakdown.byWeekday} days={breakdown.days} />
        </div>
      </div>
    </div>
  );
};

const AnalyticsSkeleton: FC = () => (
  <div className="space-y-6">
    <DashboardPageStats>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full" />
      ))}
    </DashboardPageStats>
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  </div>
);

function RouteComponent() {
  // The loader already resolved the barbershop into route context — reading it
  // back avoids a second query and the skeleton flash it caused on navigation.
  const barbershop = Route.useRouteContext({
    select: (context) => context.dashboardBarbershop,
  });

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Analíticas"
          description={ANALYTICS_DESCRIPTION}
        />
      </DashboardPageHeader>

      <DashboardPageContent>
        {barbershop?._id ? (
          <Suspense fallback={<AnalyticsSkeleton />}>
            <AnalyticsBody barbershopId={barbershop._id} />
          </Suspense>
        ) : (
          <NoBarbershop />
        )}
      </DashboardPageContent>
    </DashboardPage>
  );
}
