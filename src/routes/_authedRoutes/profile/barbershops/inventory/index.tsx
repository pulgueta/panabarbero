/** biome-ignore-all lint/style/noNonNullAssertion: Needed */

import type { Barbershop } from "@convex/schema";
import { PackageIcon, PlusIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import type { FC } from "react";
import { lazy, Suspense, useMemo, useState } from "react";

import { DashboardHeaderSkeleton } from "@/components/barbershops/dashboard-header.skeleton";
import { getInventoryTableColumns } from "@/components/inventory/table/columns";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Button } from "@/components/ui/button";
import {
  Card,
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
  barbershopByMemberUserIdQueryOptions,
  useBarbershopByMemberUserId,
} from "@/hooks/barbershop/use-barbershop";
import {
  barbershopMemberRolesQueryOptions,
  useBarbershopMemberRoles,
} from "@/hooks/barbershop/use-barbershop-member";
import {
  getBarbershopPlanQueryOptions,
  useBarbershopPlan,
} from "@/hooks/billing/use-plan";
import type { InventoryOverviewRow } from "@/hooks/use-inventory";
import {
  inventoryOverviewQueryOptions,
  lowStockQueryOptions,
  monthlyConsumptionQueryOptions,
  useInventoryOverview,
  useLowStock,
  useMonthlyConsumption,
  useValuation,
  valuationQueryOptions,
} from "@/hooks/use-inventory";
import { useSession } from "@/hooks/use-session";
import { cn, formatCurrency } from "@/lib/utils";

const DashboardHeader = lazy(() =>
  import("@/components/barbershops/dashboard-header").then((module) => ({
    default: module.DashboardHeader,
  })),
);

const DataTable = lazy(() =>
  import("@/components/table/data-table").then((module) => ({
    default: module.DataTable,
  })),
) as typeof import("@/components/table/data-table").DataTable;

const ItemDialog = lazy(() =>
  import("@/components/inventory/item-dialog").then((module) => ({
    default: module.ItemDialog,
  })),
);

const StockAdjustDialog = lazy(() =>
  import("@/components/inventory/stock-adjust-dialog").then((module) => ({
    default: module.StockAdjustDialog,
  })),
);

const ArchiveItemDialog = lazy(() =>
  import("@/components/inventory/archive-item-dialog").then((module) => ({
    default: module.ArchiveItemDialog,
  })),
);

const MovementHistory = lazy(() =>
  import("@/components/inventory/movement-history").then((module) => ({
    default: module.MovementHistory,
  })),
);

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/inventory/",
)({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  ssr: "data-only",
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async (opts) => {
    const userId = opts.context.userId;

    if (userId) {
      const barbershop = await opts.context.queryClient.ensureQueryData(
        barbershopByMemberUserIdQueryOptions(userId),
      );

      const barbershopMemberRoles =
        await opts.context.queryClient.ensureQueryData(
          barbershopMemberRolesQueryOptions(userId),
        );

      const isBarber =
        barbershopMemberRoles?.roles?.includes("barber") ?? false;

      if (
        !barbershopMemberRoles?.isOwner &&
        !barbershopMemberRoles?.isStaff &&
        !isBarber
      ) {
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

        // Spine: the overview feeds the table via useSuspenseQuery.
        await opts.context.queryClient.ensureQueryData(
          inventoryOverviewQueryOptions(barbershop._id),
        );

        // Leaves: consumed via useQuery — prime without blocking.
        void opts.context.queryClient.prefetchQuery(
          lowStockQueryOptions(barbershop._id),
        );

        if (barbershopMemberRoles?.isOwner || barbershopMemberRoles?.isStaff) {
          void opts.context.queryClient.prefetchQuery(
            valuationQueryOptions(barbershop._id),
          );
          void opts.context.queryClient.prefetchQuery(
            monthlyConsumptionQueryOptions(barbershop._id),
          );
        }
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

interface InventorySummaryCardsProps {
  barbershopId: Barbershop["_id"];
}

const InventorySummaryCards: FC<InventorySummaryCardsProps> = ({
  barbershopId,
}) => {
  const { data: valuation } = useValuation(barbershopId);
  const { data: lowStock } = useLowStock(barbershopId);
  const { data: monthlyConsumption } = useMonthlyConsumption(barbershopId);

  const lowStockCount = lowStock?.length ?? 0;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Valor del inventario</CardDescription>
          <CardTitle className="tabular-nums">
            {valuation ? formatCurrency(valuation.totalValue) : "—"}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Bajo stock</CardDescription>
          <CardTitle
            className={cn("tabular-nums", lowStockCount > 0 && "text-warning")}
          >
            {lowStockCount}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Consumido este mes</CardDescription>
          <CardTitle className="tabular-nums">
            {monthlyConsumption?.consumed ?? 0}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Vendido este mes</CardDescription>
          <CardTitle className="tabular-nums">
            {monthlyConsumption?.sold ?? 0}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
};

type InventoryDialogState = {
  type: "adjust" | "history" | "edit" | "archive" | "record";
  row: InventoryOverviewRow;
} | null;

interface InventoryDashboardProps {
  barbershopId: Barbershop["_id"];
}

const InventoryDashboard: FC<InventoryDashboardProps> = ({ barbershopId }) => {
  const [dialog, setDialog] = useState<InventoryDialogState>(null);

  const { data: overview } = useInventoryOverview(barbershopId);

  const editInitialValues = useMemo(
    () =>
      dialog?.type === "edit"
        ? {
            barbershopId,
            name: dialog.row.name,
            sku: dialog.row.sku,
            category: dialog.row.category,
            unit: dialog.row.unit,
            isSellable: dialog.row.isSellable,
            unitCost: dialog.row.unitCost ?? 0,
            salePrice: dialog.row.salePrice,
            reorderPoint: dialog.row.reorderPoint,
            reorderQuantity: dialog.row.reorderQuantity,
            allowNegativeStock: dialog.row.allowNegativeStock ?? false,
          }
        : undefined,
    [dialog, barbershopId],
  );

  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null);
  };

  const columns = getInventoryTableColumns({
    canManage: overview.canManage,
    onAdjust: (row) => setDialog({ type: "adjust", row }),
    onHistory: (row) => setDialog({ type: "history", row }),
    onEdit: (row) => setDialog({ type: "edit", row }),
    onArchive: (row) => setDialog({ type: "archive", row }),
    onRecord: (row) => setDialog({ type: "record", row }),
  });

  return (
    <div className="space-y-4">
      {overview.canManage && (
        <InventorySummaryCards barbershopId={barbershopId} />
      )}

      {overview.rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aún no tienes productos en tu inventario.</EmptyTitle>
            <EmptyDescription>
              Crea tu primer producto para empezar a controlar el stock.
            </EmptyDescription>
          </EmptyHeader>
          {overview.canManage && (
            <EmptyContent>
              <Suspense
                fallback={
                  <Button disabled>
                    <PlusIcon />
                    Crear producto
                  </Button>
                }
              >
                <ItemDialog
                  barbershopId={barbershopId}
                  trigger={
                    <Button>
                      <PlusIcon />
                      Crear producto
                    </Button>
                  }
                />
              </Suspense>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <Suspense fallback={<Skeleton className="h-32 w-full md:h-64" />}>
          <DataTable columns={columns} data={overview.rows} />
        </Suspense>
      )}

      <Suspense fallback={null}>
        {(dialog?.type === "adjust" || dialog?.type === "record") && (
          <StockAdjustDialog
            item={dialog.row}
            canManage={dialog.type === "adjust"}
            open
            onOpenChange={closeDialog}
            trigger={<span className="hidden" />}
          />
        )}

        {dialog?.type === "history" && (
          <MovementHistory
            item={dialog.row}
            open
            onOpenChange={closeDialog}
            trigger={<span className="hidden" />}
          />
        )}

        {dialog?.type === "edit" && (
          <ItemDialog
            barbershopId={barbershopId}
            itemId={dialog.row._id}
            currentImageKey={dialog.row.imageKey}
            initialValues={editInitialValues}
            open
            onOpenChange={closeDialog}
            trigger={<span className="hidden" />}
          />
        )}

        {dialog?.type === "archive" && (
          <ArchiveItemDialog
            itemId={dialog.row._id}
            barbershopId={barbershopId}
            open
            onOpenChange={closeDialog}
            trigger={<span className="hidden" />}
          />
        )}
      </Suspense>
    </div>
  );
};

function RouteComponent() {
  const { data: user } = useSession();
  const { data: rolesData } = useBarbershopMemberRoles(user?.id!);
  const { data: barbershop, isLoading: isLoadingBarbershop } =
    useBarbershopByMemberUserId(user?.id!);
  const { planLimits, isLoading: isLoadingPlan } = useBarbershopPlan(
    barbershop?._id!,
  );

  const canManageRoles = Boolean(rolesData?.isOwner || rolesData?.isStaff);
  const inventoryEnabled = planLimits.inventoryEnabled;

  return (
    <BorderContainer className="space-y-4">
      <section className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <Suspense fallback={<DashboardHeaderSkeleton />}>
            <DashboardHeader
              title="Inventario"
              description="Controla el stock, los costos y el consumo de tus productos."
            />
          </Suspense>

          <Suspense
            fallback={
              <Button disabled variant="outline">
                <PlusIcon />
                Nuevo producto
              </Button>
            }
          >
            {barbershop?._id &&
              !isLoadingBarbershop &&
              inventoryEnabled &&
              canManageRoles && (
                <ItemDialog
                  barbershopId={barbershop._id}
                  trigger={
                    <Button variant="outline">
                      <PlusIcon />
                      Nuevo producto
                    </Button>
                  }
                />
              )}
          </Suspense>
        </div>

        {isLoadingPlan || isLoadingBarbershop ? (
          <Skeleton className="h-64 w-full" />
        ) : !inventoryEnabled ? (
          <InventoryUpsell />
        ) : (
          barbershop?._id && (
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <InventoryDashboard barbershopId={barbershop._id} />
            </Suspense>
          )
        )}
      </section>
    </BorderContainer>
  );
}
