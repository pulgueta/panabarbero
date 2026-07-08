import type { Barbershop } from "@convex/schema";
import {
  ClockCounterClockwiseIcon,
  PackageIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import type { FC } from "react";
import { lazy, Suspense, useState } from "react";

import {
  DashboardPage,
  DashboardPageActions,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { DashboardPending } from "@/components/dashboard/dashboard-pending";
import {
  getInventoryTableColumns,
  inventoryCategoryOptions,
  inventoryColumnLabels,
  inventoryStatusOptions,
} from "@/components/inventory/table/columns";
import {
  DataTable,
  DataTableContent,
  DataTableSkeleton,
} from "@/components/table/data-table";
import { DataTableFacetedFilter } from "@/components/table/data-table-faceted-filter";
import { DataTablePagination } from "@/components/table/data-table-pagination";
import {
  DataTableReset,
  DataTableSearch,
  DataTableToolbar,
  DataTableViewOptions,
} from "@/components/table/data-table-toolbar";
import { useDataTable } from "@/components/table/use-data-table";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cacheTime } from "@/config/cache";
import {
  getBarbershopPlanQueryOptions,
  useBarbershopPlan,
} from "@/hooks/billing/use-plan";
import type { InventoryOverviewRow } from "@/hooks/use-inventory";
import {
  inventoryOverviewQueryOptions,
  useInventoryOverview,
} from "@/hooks/use-inventory";

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

const PRODUCTS_DESCRIPTION =
  "Controla el stock, los costos y el consumo de tus productos.";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/inventory/products/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Productos" },
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async (opts) => {
    const barbershop = opts.context.dashboardBarbershop;
    const roles = opts.context.dashboardRoles;

    const isBarber = roles?.roles?.includes("barber") ?? false;

    if (!roles?.isOwner && !roles?.isStaff && !isBarber) {
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

type InventoryDialogState = {
  type: "adjust" | "archive" | "record";
  row: InventoryOverviewRow;
} | null;

interface ProductsTableProps {
  barbershopId: Barbershop["_id"];
}

const ProductsTable: FC<ProductsTableProps> = ({ barbershopId }) => {
  const navigate = Route.useNavigate();
  const [dialog, setDialog] = useState<InventoryDialogState>(null);

  const { data: overview } = useInventoryOverview(barbershopId);

  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null);
  };

  const columns = getInventoryTableColumns({
    canManage: overview.canManage,
    onAdjust: (row) => setDialog({ type: "adjust", row }),
    onHistory: (row) =>
      void navigate({
        to: "/profile/barbershops/inventory/$itemId/history",
        params: { itemId: row._id },
      }),
    onEdit: (row) =>
      void navigate({
        to: "/profile/barbershops/inventory/$itemId/edit",
        params: { itemId: row._id },
      }),
    onArchive: (row) => setDialog({ type: "archive", row }),
    onRecord: (row) => setDialog({ type: "record", row }),
  });

  const table = useDataTable({
    data: overview.rows,
    columns,
    pageSize: 10,
    initialSorting: [{ id: "name", desc: false }],
  });

  return (
    <div className="space-y-4">
      {overview.rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageIcon />
            </EmptyMedia>
            <EmptyTitle>Aún no tienes productos en tu inventario.</EmptyTitle>
            <EmptyDescription>
              Crea tu primer producto para empezar a controlar el stock.
            </EmptyDescription>
          </EmptyHeader>
          {overview.canManage && (
            <EmptyContent>
              <Button
                nativeButton={false}
                render={<Link to="/profile/barbershops/inventory/new" />}
              >
                <PlusIcon />
                Crear producto
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <DataTable table={table}>
          <DataTableToolbar>
            <DataTableSearch placeholder="Buscar producto…" />
            <DataTableFacetedFilter
              columnId="status"
              title="Estado"
              options={inventoryStatusOptions}
            />
            <DataTableFacetedFilter
              columnId="category"
              title="Categoría"
              options={inventoryCategoryOptions}
            />
            <DataTableReset />
            <DataTableViewOptions labels={inventoryColumnLabels} />
          </DataTableToolbar>
          <DataTableContent />
          <DataTablePagination />
        </DataTable>
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

function RouteComponent() {
  const barbershop = Route.useRouteContext({
    select: (context) => context.dashboardBarbershop,
  });
  const roles = Route.useRouteContext({
    select: (context) => context.dashboardRoles,
  });

  const canManageRoles = Boolean(roles?.isOwner || roles?.isStaff);

  if (!barbershop?._id) {
    return (
      <DashboardPage>
        <DashboardPageHeader>
          <DashboardPageHeading
            title="Productos"
            description={PRODUCTS_DESCRIPTION}
          />
        </DashboardPageHeader>

        <DashboardPageContent>
          <NoBarbershop />
        </DashboardPageContent>
      </DashboardPage>
    );
  }

  return (
    <ProductsRouteBody
      barbershop={barbershop}
      canManageRoles={canManageRoles}
    />
  );
}

interface ProductsRouteBodyProps {
  barbershop: Barbershop;
  canManageRoles: boolean;
}

const ProductsRouteBody: FC<ProductsRouteBodyProps> = ({
  barbershop,
  canManageRoles,
}) => {
  const { planLimits, isLoading: isLoadingPlan } = useBarbershopPlan(
    barbershop._id,
  );
  const inventoryEnabled = planLimits.inventoryEnabled;

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Productos"
          description={PRODUCTS_DESCRIPTION}
        />

        {inventoryEnabled && canManageRoles && (
          <DashboardPageActions>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/profile/barbershops/inventory/archived" />}
            >
              <ClockCounterClockwiseIcon />
              Archivados
            </Button>
            <Button
              nativeButton={false}
              render={<Link to="/profile/barbershops/inventory/new" />}
            >
              <PlusIcon />
              Nuevo producto
            </Button>
          </DashboardPageActions>
        )}
      </DashboardPageHeader>

      <DashboardPageContent>
        {isLoadingPlan ? (
          <DataTableSkeleton columns={canManageRoles ? 8 : 6} rows={6} />
        ) : !inventoryEnabled ? (
          <InventoryUpsell />
        ) : (
          <Suspense
            fallback={
              <DataTableSkeleton columns={canManageRoles ? 8 : 6} rows={6} />
            }
          >
            <ProductsTable barbershopId={barbershop._id} />
          </Suspense>
        )}
      </DashboardPageContent>
    </DashboardPage>
  );
};
