import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDataTableContext } from "./data-table";

const plural = (n: number) => (n === 1 ? "resultado" : "resultados");

/**
 * Pagination footer. Server tables (a `server` bag in context) get a reactive
 * "Cargar más"; client tables get prev/next once there's more than one page,
 * otherwise just a result count. No numbered pages — cursor backends can't
 * random-access.
 */
interface DataTablePaginationProps {
  className?: string;
}

export function DataTablePagination({ className }: DataTablePaginationProps) {
  const { table, server } = useDataTableContext();

  if (server) {
    const loaded = table.getRowModel().rows.length;
    return (
      <div className={cn("flex items-center justify-between gap-2", className)}>
        <p className="text-muted-foreground text-sm tabular-nums">
          {loaded} {plural(loaded)}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={server.status !== "CanLoadMore"}
          onClick={() => server.loadMore(server.pageSize ?? 20)}
        >
          {server.status === "LoadingMore"
            ? "Cargando…"
            : server.status === "Exhausted"
              ? "No hay más"
              : "Cargar más"}
        </Button>
      </div>
    );
  }

  const total = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  if (pageCount <= 1) {
    return (
      <p
        className={cn("text-muted-foreground text-sm tabular-nums", className)}
      >
        {total} {plural(total)}
      </p>
    );
  }

  const pageIndex = table.getState().pagination.pageIndex;

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <p className="text-muted-foreground text-sm tabular-nums">
        Página {pageIndex + 1} de {pageCount} · {total} {plural(total)}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
