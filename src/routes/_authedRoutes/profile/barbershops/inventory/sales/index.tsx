import type { Barbershop } from "@convex/schema";
import { PackageIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { type FC, lazy, Suspense } from "react";

import {
  DashboardPage,
  DashboardPageActions,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { DashboardPending } from "@/components/dashboard/dashboard-pending";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import {
  getBarbershopPlanQueryOptions,
  useBarbershopPlan,
} from "@/hooks/billing/use-plan";
import {
  recentSalesQueryOptions,
  salesMetricsQueryOptions,
} from "@/hooks/use-inventory-sales";

const RecentSales = lazy(() =>
  import("@/components/inventory/sales/recent-sales").then((module) => ({
    default: module.RecentSales,
  })),
);
const SalesRevenueChart = lazy(() =>
  import("@/components/inventory/sales/sales-revenue-chart").then((module) => ({
    default: module.SalesRevenueChart,
  })),
);
const SalesSummaryCards = lazy(() =>
  import("@/components/inventory/sales/sales-summary-cards").then((module) => ({
    default: module.SalesSummaryCards,
  })),
);
const TopProductsChart = lazy(() =>
  import("@/components/inventory/sales/top-products-chart").then((module) => ({
    default: module.TopProductsChart,
  })),
);

const SALES_DESCRIPTION =
  "El pulso de tus ventas de productos: ingresos, tendencia y ventas recientes.";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/inventory/sales/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Ventas" },
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async ({ context }) => {
    const barbershop = context.dashboardBarbershop;
    const roles = context.dashboardRoles;

    if (!roles?.isOwner && !roles?.isStaff) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }

    if (!barbershop?._id) return;

    const plan = await context.queryClient.ensureQueryData(
      getBarbershopPlanQueryOptions(barbershop._id),
    );

    if (plan?.planLimits.inventoryEnabled) {
      // Spine: the KPI strip and both charts read the same metrics query.
      await context.queryClient.ensureQueryData(
        salesMetricsQueryOptions(barbershop._id),
      );
      void context.queryClient.prefetchQuery(
        recentSalesQueryOptions(barbershop._id),
      );
    }
  },
});

const InventoryUpsell: FC = () => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <PackageIcon />
      </EmptyMedia>
      <EmptyTitle>
        El inventario está disponible en los planes Pro y Premium.
      </EmptyTitle>
      <EmptyDescription>
        Registra ventas y descuenta el stock de forma automática.
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Button nativeButton={false} render={<Link to="/pricing" />}>
        Ver planes
      </Button>
    </EmptyContent>
  </Empty>
);

const NoBarbershop: FC = () => (
  <Empty>
    <EmptyHeader>
      <EmptyTitle>No tienes una barbería asociada.</EmptyTitle>
      <EmptyDescription>
        Crea o únete a una barbería para registrar ventas.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

const SalesBody: FC<{ barbershop: Barbershop }> = ({ barbershop }) => {
  const { planLimits, isLoading } = useBarbershopPlan(barbershop._id);
  if (isLoading) return <SalesSkeleton />;
  if (!planLimits.inventoryEnabled) return <InventoryUpsell />;

  return (
    <div className="space-y-6">
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        }
      >
        <SalesSummaryCards barbershopId={barbershop._id} />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <SalesRevenueChart barbershopId={barbershop._id} />
        </Suspense>
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <TopProductsChart barbershopId={barbershop._id} />
        </Suspense>
      </div>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RecentSales barbershopId={barbershop._id} />
      </Suspense>
    </div>
  );
};

const SalesSkeleton: FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full" />
      ))}
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
    <Skeleton className="h-96 w-full" />
  </div>
);

function RouteComponent() {
  const barbershop = Route.useRouteContext({
    select: (context) => context.dashboardBarbershop,
  });

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading title="Ventas" description={SALES_DESCRIPTION} />
        <DashboardPageActions>
          <Button
            nativeButton={false}
            render={<Link to="/profile/barbershops/inventory/sales/new" />}
          >
            Registrar venta
          </Button>
        </DashboardPageActions>
      </DashboardPageHeader>
      <DashboardPageContent>
        {barbershop ? <SalesBody barbershop={barbershop} /> : <NoBarbershop />}
      </DashboardPageContent>
    </DashboardPage>
  );
}
