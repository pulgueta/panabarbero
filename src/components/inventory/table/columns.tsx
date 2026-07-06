import { PackageIcon } from "@phosphor-icons/react";
import type { ColumnDef } from "@tanstack/react-table";

import {
  formatPresentation,
  inventoryCategoryLabels,
  inventoryUnitSuffixes,
} from "@/components/inventory/labels";
import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { facetedFilterFn } from "@/components/table/data-table-faceted-filter";
import { DataTableRowActions } from "@/components/table/data-table-row-actions";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InventoryOverviewRow } from "@/hooks/use-inventory";
import { getLogoUrl } from "@/hooks/use-upload";
import { formatCurrency } from "@/lib/utils";

function getStockStatus(row: InventoryOverviewRow): {
  label: string;
  variant: BadgeProps["variant"];
} {
  if (row.onHand <= 0) {
    return { label: "Agotado", variant: "destructive" };
  }
  if (row.belowReorder) {
    return { label: "Bajo stock", variant: "warning" };
  }
  return { label: "En stock", variant: "success" };
}

/** Facet options for the toolbar (kept in sync with `getStockStatus` labels). */
export const inventoryStatusOptions = [
  { value: "En stock", label: "En stock" },
  { value: "Bajo stock", label: "Bajo stock" },
  { value: "Agotado", label: "Agotado" },
];

export const inventoryCategoryOptions = Object.entries(
  inventoryCategoryLabels,
).map(([value, label]) => ({ value, label }));

/** Human labels for the column-visibility menu. */
export const inventoryColumnLabels: Record<string, string> = {
  name: "Nombre",
  category: "Categoría",
  status: "Estado",
  onHand: "Stock",
  unitCost: "Costo",
  value: "Valor",
};

interface InventoryTableColumnsOpts {
  canManage: boolean;
  onAdjust: (row: InventoryOverviewRow) => void;
  onHistory: (row: InventoryOverviewRow) => void;
  onEdit: (row: InventoryOverviewRow) => void;
  onArchive: (row: InventoryOverviewRow) => void;
  onRecord: (row: InventoryOverviewRow) => void;
}

export function getInventoryTableColumns(
  opts: InventoryTableColumnsOpts,
): ColumnDef<InventoryOverviewRow>[] {
  const columns: ColumnDef<InventoryOverviewRow>[] = [
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
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
      enableHiding: false,
      cell: ({ row }) => {
        const subtitle = [row.original.brand, row.original.sku]
          .filter(Boolean)
          .join(" · ");

        return (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.name}</p>
            {subtitle ? (
              <p className="truncate text-muted-foreground text-xs">
                {subtitle}
              </p>
            ) : null}
            {row.original.customLabel ? (
              <p className="truncate text-muted-foreground text-xs">
                {row.original.customLabel}
              </p>
            ) : null}
            {/* The stock column scrolls out of view on phones — the number
                and state a manager opens the app for stay on the name cell. */}
            <p className="text-muted-foreground text-xs tabular-nums sm:hidden">
              {row.original.onHand} {inventoryUnitSuffixes[row.original.unit]}
              {` · ${getStockStatus(row.original).label}`}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Categoría" />
      ),
      filterFn: facetedFilterFn,
      cell: ({ row }) => inventoryCategoryLabels[row.original.category],
    },
    {
      id: "status",
      accessorFn: (row) => getStockStatus(row).label,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estado" />
      ),
      filterFn: facetedFilterFn,
      cell: ({ row }) => {
        const { label, variant } = getStockStatus(row.original);
        return <Badge variant={variant}>{label}</Badge>;
      },
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
          {row.original.reserved > 0 ? (
            <p className="text-muted-foreground text-xs">
              {row.original.reserved} en reserva
            </p>
          ) : null}
        </div>
      ),
    },
  ];

  if (opts.canManage) {
    columns.push(
      {
        accessorKey: "unitCost",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Costo" align="end" />
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.original.unitCost ?? 0)}
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
            {formatCurrency(row.original.value ?? 0)}
          </div>
        ),
      },
    );
  }

  columns.push({
    id: "actions",
    enableSorting: false,
    enableHiding: false,
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) =>
      opts.canManage ? (
        <div className="flex justify-end">
          <DataTableRowActions
            label={`Acciones de ${row.original.name}`}
            actions={[
              {
                label: "Ajustar stock",
                onSelect: () => opts.onAdjust(row.original),
              },
              {
                label: "Historial",
                onSelect: () => opts.onHistory(row.original),
              },
              { label: "Editar", onSelect: () => opts.onEdit(row.original) },
              {
                label: "Archivar",
                variant: "destructive",
                separatorBefore: true,
                onSelect: () => opts.onArchive(row.original),
              },
            ]}
          />
        </div>
      ) : row.original.stockBehavior === "durable" ? null : (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => opts.onRecord(row.original)}
          >
            Registrar
          </Button>
        </div>
      ),
  });

  return columns;
}
