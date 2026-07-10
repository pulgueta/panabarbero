import type { Barbershop } from "@convex/schema";
import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  ClockCounterClockwiseIcon,
  PackageIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import type { FC } from "react";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import {
  DashboardPage,
  DashboardPageActions,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { DashboardPending } from "@/components/dashboard/dashboard-pending";
import {
  formatPresentation,
  inventoryCategoryLabels,
  inventoryUnitSuffixes,
} from "@/components/inventory/labels";
import { inventoryCategoryOptions } from "@/components/inventory/table/columns";
import {
  DataTable,
  DataTableContent,
  DataTableSkeleton,
} from "@/components/table/data-table";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/table/data-table-faceted-filter";
import { DataTablePagination } from "@/components/table/data-table-pagination";
import { DataTableRowActions } from "@/components/table/data-table-row-actions";
import {
  DataTableReset,
  DataTableSearch,
  DataTableToolbar,
  DataTableViewOptions,
} from "@/components/table/data-table-toolbar";
import { useDataTable } from "@/components/table/use-data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { cacheTime } from "@/config/cache";
import { useBarbershopByMemberUserId } from "@/hooks/barbershop/use-barbershop";
import { getBarbershopPlanQueryOptions } from "@/hooks/billing/use-plan";
import type { ArchivedInventoryRow } from "@/hooks/use-inventory";
import {
  archivedInventoryQueryOptions,
  useArchivedInventory,
  useInventoryActions,
} from "@/hooks/use-inventory";
import { useSession } from "@/hooks/use-session";
import { getLogoUrl } from "@/hooks/use-upload";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { formatCurrency } from "@/lib/utils";

const ARCHIVED_DESCRIPTION =
  "Consulta productos fuera del inventario activo, revisa su historial y restaura los que vuelvan a usarse.";

const archivedColumnLabels: Record<string, string> = {
  name: "Producto",
  category: "Categoría",
  deletedAt: "Archivado",
  onHand: "Stock",
  value: "Valor",
};

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/inventory/archived/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Archivados" },
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async ({ context }) => {
    const barbershop = context.dashboardBarbershop;
    const roles = context.dashboardRoles;

    if (!barbershop?._id || (!roles?.isOwner && !roles?.isStaff)) {
      throw redirect({ to: "/profile/barbershops/inventory" });
    }

    const plan = await context.queryClient.ensureQueryData(
      getBarbershopPlanQueryOptions(barbershop._id),
    );

    if (!plan?.planLimits.inventoryEnabled) {
      throw redirect({ to: "/profile/barbershops/inventory" });
    }

    await context.queryClient.ensureQueryData(
      archivedInventoryQueryOptions(barbershop._id),
    );
  },
});

function formatArchivedDate(timestamp?: number) {
  if (!timestamp) return "Sin fecha";

  return new Date(timestamp).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getArchivedColumns({
  restoringItemId,
  onRestore,
  onHistory,
}: {
  restoringItemId: ArchivedInventoryRow["_id"] | null;
  onRestore: (row: ArchivedInventoryRow) => void;
  onHistory: (row: ArchivedInventoryRow) => void;
}): ColumnDef<ArchivedInventoryRow>[] {
  return [
    {
      id: "photo",
      accessorKey: "imageKey",
      header: () => <span className="sr-only">Foto</span>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const imageUrl = getLogoUrl(row.original.imageKey);

        return imageUrl ? (
          <img
            src={imageUrl}
            alt={row.original.name}
            className="size-10 rounded-md border object-cover"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-md border bg-muted">
            <PackageIcon className="size-5 text-muted-foreground" />
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Producto" />
      ),
      enableHiding: false,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          {row.original.sku ? (
            <p className="truncate text-muted-foreground text-xs">
              {row.original.sku}
            </p>
          ) : null}
          {row.original.customLabel ? (
            <p className="truncate text-muted-foreground text-xs">
              {row.original.customLabel}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Categoría" />
      ),
      cell: ({ row }) => inventoryCategoryLabels[row.original.category],
    },
    {
      accessorKey: "deletedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Archivado" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground" suppressHydrationWarning>
          {formatArchivedDate(row.original.deletedAt)}
        </span>
      ),
    },
    {
      accessorKey: "onHand",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stock" align="end" />
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          <p>
            {row.original.onHand} {inventoryUnitSuffixes[row.original.unit]}
          </p>
          {row.original.presentationValue && row.original.presentationUnit ? (
            <p className="text-muted-foreground text-xs">
              {formatPresentation(
                row.original.presentationValue,
                row.original.presentationUnit,
              )}{" "}
              c/u
            </p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "value",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valor" align="end" />
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(row.original.value)}
        </div>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DataTableRowActions
            label={`Acciones de ${row.original.name}`}
            actions={[
              {
                label: "Ver historial",
                onSelect: () => onHistory(row.original),
              },
              {
                label: "Restaurar",
                icon:
                  restoringItemId === row.original._id ? (
                    <Spinner />
                  ) : (
                    <ArrowCounterClockwiseIcon />
                  ),
                disabled: restoringItemId !== null,
                onSelect: () => onRestore(row.original),
              },
            ]}
          />
        </div>
      ),
    },
  ];
}

interface ArchivedInventoryBodyProps {
  barbershopId: Barbershop["_id"];
}

const ArchivedInventoryBody: FC<ArchivedInventoryBodyProps> = ({
  barbershopId,
}) => {
  const navigate = Route.useNavigate();
  const { data: rows } = useArchivedInventory(barbershopId);
  const { restoreItemMutation } = useInventoryActions();
  const [restoringItemId, setRestoringItemId] = useState<
    ArchivedInventoryRow["_id"] | null
  >(null);

  const columns = getArchivedColumns({
    restoringItemId,
    onHistory: (row) =>
      void navigate({
        to: "/profile/barbershops/inventory/$itemId/history",
        params: { itemId: row._id },
      }),
    onRestore: (row) => {
      setRestoringItemId(row._id);
      void restoreItemMutation
        .mutateAsync({
          item: { id: row._id },
          barbershop: { id: barbershopId },
        })
        .then(
          () => toast.success("Producto restaurado"),
          (error) => toast.error(getConvexErrorMessage(error)),
        )
        .finally(() => setRestoringItemId(null));
    },
  });

  const table = useDataTable({
    data: rows,
    columns,
    pageSize: 10,
    initialSorting: [{ id: "deletedAt", desc: true }],
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-[minmax(0,1fr)_minmax(14rem,20rem)] md:items-center">
          <div className="space-y-1">
            <p className="font-medium">Restaurar no reconstruye el stock.</p>
            <p className="text-muted-foreground">
              Al archivar se liberan reservas, se da de baja el stock y se
              separan los insumos de los servicios. El historial queda intacto
              para auditar cada cambio.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-3">
            <div>
              <p className="text-muted-foreground text-xs">Archivados</p>
              <p className="font-semibold text-lg tabular-nums">
                {rows.length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Valor actual</p>
              <p className="font-semibold text-lg tabular-nums">
                {formatCurrency(
                  rows.reduce((total, row) => total + row.value, 0),
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClockCounterClockwiseIcon />
            </EmptyMedia>
            <EmptyTitle>No hay productos archivados.</EmptyTitle>
            <EmptyDescription>
              Cuando archives un producto, aparecerá aquí con sus movimientos y
              eventos de auditoría para que puedas revisarlo o restaurarlo.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/profile/barbershops/inventory" />}
            >
              <ArrowLeftIcon />
              Volver al inventario
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <DataTable table={table}>
          <DataTableToolbar>
            <DataTableSearch placeholder="Buscar archivado…" />
            <DataTableFacetedFilter
              columnId="category"
              title="Categoría"
              options={inventoryCategoryOptions}
            />
            <DataTableReset />
            <DataTableViewOptions labels={archivedColumnLabels} />
          </DataTableToolbar>
          <DataTableContent />
          <DataTablePagination />
        </DataTable>
      )}
    </div>
  );
};

function RouteComponent() {
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByMemberUserId(user?.id ?? "");

  if (!barbershop?._id) {
    return null;
  }

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Productos archivados"
          description={ARCHIVED_DESCRIPTION}
        />
        <DashboardPageActions>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/profile/barbershops/inventory" />}
          >
            <ArrowLeftIcon />
            Volver
          </Button>
        </DashboardPageActions>
      </DashboardPageHeader>

      <DashboardPageContent>
        <Suspense fallback={<DataTableSkeleton columns={7} rows={6} />}>
          <ArchivedInventoryBody barbershopId={barbershop._id} />
        </Suspense>
      </DashboardPageContent>
    </DashboardPage>
  );
}
