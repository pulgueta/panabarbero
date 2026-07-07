import type { Service } from "@convex/schema";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { DataTableRowActions } from "@/components/table/data-table-row-actions";
import { formatCurrency } from "@/lib/utils";

export type ServiceRow = Service;

interface ServicesTableColumnsOpts {
  canManage: boolean;
  supplyCountByServiceId?: Map<Service["_id"], number>;
  onEdit: (row: ServiceRow) => void;
  onRecipe: (row: ServiceRow) => void;
  onDelete: (row: ServiceRow) => void;
}

export function getServicesTableColumns(
  opts: ServicesTableColumnsOpts,
): ColumnDef<ServiceRow>[] {
  const columns: ColumnDef<ServiceRow>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Nombre" />
      ),
      enableHiding: false,
      cell: ({ row }) => (
        <p className="truncate font-medium">{row.original.name}</p>
      ),
    },
    {
      accessorKey: "duration",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Duración" align="end" />
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {row.original.duration} min
        </div>
      ),
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Precio" align="end" />
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {formatCurrency(row.original.price)}
        </div>
      ),
    },
  ];

  if (opts.supplyCountByServiceId) {
    columns.push({
      id: "supplyCount",
      accessorFn: (row) => opts.supplyCountByServiceId?.get(row._id) ?? 0,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Insumos" align="end" />
      ),
      cell: ({ getValue }) => {
        const count = getValue<number>();

        return (
          <div className="text-right text-muted-foreground tabular-nums">
            {count === 1 ? "1 insumo" : `${count} insumos`}
          </div>
        );
      },
    });
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
              { label: "Editar", onSelect: () => opts.onEdit(row.original) },
              { label: "Insumos", onSelect: () => opts.onRecipe(row.original) },
              {
                label: "Eliminar",
                variant: "destructive",
                separatorBefore: true,
                onSelect: () => opts.onDelete(row.original),
              },
            ]}
          />
        </div>
      ) : null,
  });

  return columns;
}
