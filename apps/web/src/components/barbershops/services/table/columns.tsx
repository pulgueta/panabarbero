import type { Service } from "@panabarbero/convex/schemas";
import type { ColumnDef } from "@tanstack/react-table";

import { formatCurrency } from "@/lib/form-utils";

export const servicesTableColumns: ColumnDef<Service>[] = [
  {
    accessorKey: "name",
    header: () => <div className="text-center">Servicio</div>,
    cell: ({ row }) => <div className="text-center">{row.original.name}</div>,
  },
  {
    accessorKey: "duration",
    header: () => <div className="text-center">Duración</div>,
    cell: ({ row }) => (
      <div className="text-center">{row.original.duration} min</div>
    ),
  },
  {
    accessorKey: "price",
    header: () => <div className="text-center">Precio</div>,
    cell: ({ row }) => (
      <div className="text-center">{formatCurrency(row.original.price)}</div>
    ),
  },
];


