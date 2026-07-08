import type { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import type { ShopReviewRow, ShopReviewStatus } from "@/hooks/use-reviews";

/** Badge label + variant per moderation status (DESIGN.md §7 soft-fill states). */
const statusMeta: Record<
  ShopReviewStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  published: { label: "Publicada", variant: "success" },
  flagged: { label: "Marcada", variant: "destructive" },
  pending: { label: "Pendiente", variant: "warning" },
};

const shortDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
});

interface ShopReviewColumnsOpts {
  onView: (row: ShopReviewRow) => void;
}

/**
 * Columns for the owner review feed. Server-paginated → sorting is disabled on
 * every column (the backend orders by index, not by an arbitrary sort key).
 */
export function getShopReviewColumns({
  onView,
}: ShopReviewColumnsOpts): ColumnDef<ShopReviewRow>[] {
  return [
    {
      id: "authorName",
      accessorKey: "authorName",
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cliente" />
      ),
      cell: ({ row }) => (
        <p className="truncate font-medium">{row.original.authorName}</p>
      ),
    },
    {
      id: "serviceName",
      accessorKey: "serviceName",
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Servicio" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.serviceName}
        </span>
      ),
    },
    {
      id: "rating",
      accessorKey: "rating",
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Calificación" />
      ),
      cell: ({ row }) => (
        <StarRating
          readOnly
          value={row.original.rating}
          starClassName="size-3.5"
        />
      ),
    },
    {
      id: "comment",
      accessorKey: "comment",
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Comentario" />
      ),
      cell: ({ row }) =>
        row.original.comment ? (
          <p className="max-w-xs truncate text-muted-foreground">
            {row.original.comment}
          </p>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "status",
      accessorKey: "status",
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Estado" />
      ),
      cell: ({ row }) => {
        const meta = statusMeta[row.original.status];
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
    {
      id: "createdAt",
      accessorKey: "_creationTime",
      enableSorting: false,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Fecha" align="end" />
      ),
      cell: ({ row }) => (
        <div className="text-right text-muted-foreground tabular-nums">
          {shortDateFormatter.format(row.original._creationTime)}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(row.original)}
          >
            Ver
          </Button>
        </div>
      ),
    },
  ];
}
