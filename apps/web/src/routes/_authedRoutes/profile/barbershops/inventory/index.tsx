import type { Barbershop } from "@convex/schema";
import { PackageIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import type { FC } from "react";
import { lazy, Suspense } from "react";

import {
  DashboardPage,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { DashboardPending } from "@/components/dashboard/dashboard-pending";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  type InventoryOverviewRow,
  inventoryOverviewQueryOptions,
  lowStockQueryOptions,
  monthlyConsumptionQueryOptions,
  movementTrendQueryOptions,
  shopMovementsPaginatedQueryOptions,
  useInventoryOverview,
  valuationQueryOptions,
} from "@/hooks/use-inventory";

const CategoryBreakdownChart = lazy(() =>
  import("@/components/inventory/category-breakdown-chart").then((module) => ({
    default: module.CategoryBreakdownChart,
  })),
);
const LowStockCard = lazy(() =>
  import("@/components/inventory/low-stock-card").then((module) => ({
    default: module.LowStockCard,
  })),
);
const MovementTrendChart = lazy(() =>
  import("@/components/inventory/movement-trend-chart").then((module) => ({
    default: module.MovementTrendChart,
  })),
);
const ShopMovementList = lazy(() =>
  import("@/components/inventory/shop-movement-list").then((module) => ({
    default: module.ShopMovementList,
  })),
);
const InventorySummaryCards = lazy(() =>
  import("@/components/inventory/summary-cards").then((module) => ({
    default: module.InventorySummaryCards,
  })),
);

const OVERVIEW_DESCRIPTION =
  "El estado de tu inventario de un vistazo: valor, actividad y alertas.";

const RECENT_MOVEMENTS_PAGE_SIZE = 5;

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/inventory/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Resumen" },
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async (opts) => {
    const barbershop = opts.context.dashboardBarbershop;
    const roles = opts.context.dashboardRoles;
    const canManage = Boolean(roles?.isOwner || roles?.isStaff);
    const canView = canManage || Boolean(roles?.roles?.includes("barber"));

    if (!canView) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }

    if (barbershop?._id) {
      const plan = await opts.context.queryClient.ensureQueryData(
        getBarbershopPlanQueryOptions(barbershop._id),
      );

      // Inventory queries throw for plans without the feature — the page
      // renders the upsell instead, so skip priming them entirely.
      if (!plan?.planLimits.inventoryEnabled) {
        return;
      }

      // Spine: the overview feeds the category breakdown via useSuspenseQuery.
      await opts.context.queryClient.ensureQueryData(
        inventoryOverviewQueryOptions(barbershop._id),
      );

      // The remaining widgets expose costs and the full movement ledger.
      if (canManage) {
        // Leaves: prime the KPI strip, charts and recent activity without blocking.
        void opts.context.queryClient.prefetchQuery(
          valuationQueryOptions(barbershop._id),
        );
        void opts.context.queryClient.prefetchQuery(
          lowStockQueryOptions(barbershop._id),
        );
        void opts.context.queryClient.prefetchQuery(
          monthlyConsumptionQueryOptions(barbershop._id),
        );
        void opts.context.queryClient.prefetchQuery(
          movementTrendQueryOptions(barbershop._id),
        );
        void opts.context.queryClient.prefetchQuery(
          shopMovementsPaginatedQueryOptions(
            barbershop._id,
            null,
            RECENT_MOVEMENTS_PAGE_SIZE,
          ),
        );
      }
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
        Controla el stock de tus productos, recibe alertas de bajo stock y
        descuenta insumos automáticamente al completar servicios.
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
        Crea o únete a una barbería para gestionar inventario.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

interface OverviewBodyProps {
  barbershopId: Barbershop["_id"];
}

interface BarberInventorySummaryProps {
  rows: InventoryOverviewRow[];
}

const BarberInventorySummary: FC<BarberInventorySummaryProps> = ({ rows }) => {
  const sellableCount = rows.filter((row) => row.isSellable).length;
  const lowStockCount = rows.filter((row) => row.belowReorder).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Productos activos</CardDescription>
            <CardTitle className="tabular-nums">{rows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Disponibles para venta</CardDescription>
            <CardTitle className="tabular-nums">{sellableCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Alertas de stock</CardDescription>
            <CardTitle className="tabular-nums">{lowStockCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vista operativa</CardTitle>
          <CardDescription>
            Puedes consultar existencias y registrar ventas. Los costos, la
            valorización y el historial completo están reservados para la
            administración.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            nativeButton={false}
            render={<Link to="/profile/barbershops/inventory/sales" />}
          >
            Ir a ventas
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const OverviewBody: FC<OverviewBodyProps> = ({ barbershopId }) => {
  const { data: overview } = useInventoryOverview(barbershopId);

  if (!overview.canManage) {
    return <BarberInventorySummary rows={overview.rows} />;
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <InventorySummaryCards barbershopId={barbershopId} />
      </Suspense>

      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <MovementTrendChart barbershopId={barbershopId} />
        </Suspense>

        <Card>
          <CardHeader>
            <CardTitle>Movimientos recientes</CardTitle>
            <CardDescription>
              Los últimos registros del historial de inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <ShopMovementList
                barbershopId={barbershopId}
                pageSize={RECENT_MOVEMENTS_PAGE_SIZE}
                showLoadMore={false}
              />
            </Suspense>
            <div className="flex justify-end pt-3">
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link to="/profile/barbershops/inventory/movements" />}
              >
                Ver todo el historial
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <CategoryBreakdownChart
            rows={overview.rows}
            canManage={overview.canManage}
          />
        </Suspense>

        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <LowStockCard barbershopId={barbershopId} />
        </Suspense>
      </div>
    </div>
  );
};

const OverviewSkeleton: FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full" />
      ))}
    </div>
    <Skeleton className="h-80 w-full" />
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  </div>
);

function RouteComponent() {
  const barbershop = Route.useRouteContext({
    select: (context) => context.dashboardBarbershop,
  });

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Inventario"
          description={OVERVIEW_DESCRIPTION}
        />
      </DashboardPageHeader>

      <DashboardPageContent>
        {barbershop?._id ? (
          <Suspense fallback={<OverviewSkeleton />}>
            <OverviewRouteBody barbershop={barbershop} />
          </Suspense>
        ) : (
          <NoBarbershop />
        )}
      </DashboardPageContent>
    </DashboardPage>
  );
}

interface OverviewRouteBodyProps {
  barbershop: Barbershop;
}

const OverviewRouteBody: FC<OverviewRouteBodyProps> = ({ barbershop }) => {
  const { planLimits, isLoading: isLoadingPlan } = useBarbershopPlan(
    barbershop._id,
  );

  if (isLoadingPlan) {
    return <OverviewSkeleton />;
  }

  if (!planLimits.inventoryEnabled) {
    return <InventoryUpsell />;
  }

  return <OverviewBody barbershopId={barbershop._id} />;
};
