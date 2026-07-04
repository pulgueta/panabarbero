import {
  ArchiveIcon,
  ClockCounterClockwiseIcon,
  DotsThreeVerticalIcon,
  PackageIcon,
  PencilSimpleIcon,
  PlusMinusIcon,
} from "@phosphor-icons/react";
import type { ColumnDef } from "@tanstack/react-table";

import {
  inventoryCategoryLabels,
  inventoryUnitSuffixes,
} from "@/components/inventory/labels";
import { TableHeader } from "@/components/table/header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const baseColumns: ColumnDef<InventoryOverviewRow>[] = [
    {
      accessorKey: "imageKey",
      header: () => <span className="sr-only">Foto</span>,
      cell: ({ row }) => {
        const imageUrl = getLogoUrl(row.original.imageKey);

        return (
          <div className="flex justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={row.original.name}
                className="size-10 rounded-md border object-cover"
              />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-md border bg-muted">
                <PackageIcon className="size-5 text-muted-foreground" />
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: ({ column }) => <TableHeader column={column} header="Nombre" />,
      cell: ({ row }) => (
        <div className="text-center">
          <p className="font-medium">{row.original.name}</p>
          {row.original.sku && (
            <p className="text-muted-foreground text-xs">{row.original.sku}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <TableHeader column={column} header="Categoría" />
      ),
      cell: ({ row }) => (
        <div className="text-center">
          {inventoryCategoryLabels[row.original.category]}
        </div>
      ),
    },
    {
      accessorKey: "onHand",
      header: ({ column }) => <TableHeader column={column} header="Stock" />,
      cell: ({ row }) => (
        <div className="text-center">
          <p className="tabular-nums">
            {row.original.onHand} {inventoryUnitSuffixes[row.original.unit]}
          </p>
          {row.original.reserved > 0 && (
            <p className="text-muted-foreground text-xs">
              {row.original.reserved} en reserva
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "belowReorder",
      header: ({ column }) => <TableHeader column={column} header="Estado" />,
      cell: ({ row }) => {
        const { label, variant } = getStockStatus(row.original);

        return (
          <div className="text-center">
            <Badge variant={variant}>{label}</Badge>
          </div>
        );
      },
    },
  ];

  const managerColumns: ColumnDef<InventoryOverviewRow>[] = [
    {
      accessorKey: "unitCost",
      header: ({ column }) => <TableHeader column={column} header="Costo" />,
      cell: ({ row }) => (
        <div className="text-center tabular-nums">
          {formatCurrency(row.original.unitCost ?? 0)}
        </div>
      ),
    },
    {
      accessorKey: "value",
      header: ({ column }) => <TableHeader column={column} header="Valor" />,
      cell: ({ row }) => (
        <div className="text-center tabular-nums">
          {formatCurrency(row.original.value ?? 0)}
        </div>
      ),
    },
  ];

  const actionsColumn: ColumnDef<InventoryOverviewRow> = {
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) =>
      opts.canManage ? (
        <div className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Acciones de ${row.original.name}`}
                >
                  <DotsThreeVerticalIcon />
                </Button>
              }
            />

            <DropdownMenuContent align="end" className="w-full max-w-56">
              <DropdownMenuItem
                onClick={() => opts.onAdjust(row.original)}
                render={
                  <Button variant="outline" className="w-full">
                    <PlusMinusIcon />
                    Ajustar stock
                  </Button>
                }
              />
              <DropdownMenuItem
                onClick={() => opts.onHistory(row.original)}
                render={
                  <Button variant="outline" className="w-full">
                    <ClockCounterClockwiseIcon />
                    Historial
                  </Button>
                }
              />
              <DropdownMenuItem
                onClick={() => opts.onEdit(row.original)}
                render={
                  <Button variant="outline" className="w-full">
                    <PencilSimpleIcon />
                    Editar
                  </Button>
                }
              />

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => opts.onArchive(row.original)}
                render={
                  <Button variant="destructive" className="w-full">
                    <ArchiveIcon />
                    Archivar
                  </Button>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="text-center">
          <Button variant="outline" onClick={() => opts.onRecord(row.original)}>
            Registrar
          </Button>
        </div>
      ),
  };

  if (!opts.canManage) {
    return [...baseColumns, actionsColumn];
  }

  return [...baseColumns, ...managerColumns, actionsColumn];
}
