import type { Table as TanstackTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  use,
  useMemo,
} from "react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Server-driven pagination state, mirroring Convex `usePaginatedQuery`. Present
 * only when a section paginates on the server; absent for client-side tables.
 */
export type DataTableServer = {
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  loadMore: (numItems: number) => void;
  pageSize?: number;
};

interface DataTableContextValue<TData> {
  table: TanstackTable<TData>;
  server?: DataTableServer;
}

const DataTableContext = createContext<DataTableContextValue<unknown> | null>(
  null,
);

export function useDataTableContext<TData = unknown>() {
  const ctx = use(DataTableContext);
  if (!ctx) {
    throw new Error("DataTable.* components must be used within <DataTable>");
  }
  return ctx as DataTableContextValue<TData>;
}

/**
 * Compound table root: the provider. Build the `table` with `useDataTable`
 * (client) or a manual-mode section hook (server, passing `server`), then
 * compose only the slots you need:
 *
 * ```tsx
 * <DataTable table={table}>
 *   <DataTableToolbar>
 *     <DataTableSearch placeholder="Buscar producto…" />
 *     <DataTableFacetedFilter columnId="category" title="Categoría" options={…} />
 *     <DataTableViewOptions labels={…} />
 *   </DataTableToolbar>
 *   <DataTableContent empty={<EmptyState … />} />
 *   <DataTablePagination />
 * </DataTable>
 * ```
 */
interface DataTableProps<TData> extends PropsWithChildren {
  table: TanstackTable<TData>;
  server?: DataTableServer;
  className?: string;
}

export function DataTable<TData>({
  table,
  server,
  className,
  children,
}: DataTableProps<TData>) {
  const value = useMemo(
    () => ({ table: table as TanstackTable<unknown>, server }),
    [table, server],
  );

  return (
    <DataTableContext value={value}>
      <div data-slot="data-table" className={cn("space-y-4", className)}>
        {children}
      </div>
    </DataTableContext>
  );
}

export function DataTableContent<TData = unknown>({
  className,
  empty,
}: {
  className?: string;
  /** Shown when there are no rows. Falls back to a filter-aware default. */
  empty?: ReactNode;
}) {
  const { table } = useDataTableContext<TData>();
  const rows = table.getRowModel().rows;
  const colCount = table.getVisibleLeafColumns().length;
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    Boolean(table.getState().globalFilter);

  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-x-auto overflow-y-hidden rounded-xl border",
        className,
      )}
    >
      <Table className="min-w-full">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="text-muted-foreground">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colCount} className="h-40 p-6 text-center">
                {empty ?? (
                  <p className="text-muted-foreground text-sm">
                    {isFiltered
                      ? "Sin resultados para estos filtros."
                      : "No hay resultados."}
                  </p>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Loading placeholder that mirrors the table frame — use as a route
 * `pendingComponent` / Suspense fallback so navigation doesn't shift layout.
 */
export function DataTableSkeleton({
  columns = 5,
  rows = 8,
  className,
}: {
  columns?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("overflow-hidden rounded-xl border", className)}
      aria-hidden
    >
      <div className="flex h-10 items-center gap-4 border-b bg-muted/30 px-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-3.5 w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={`r-${r}`}
          className="flex h-13 items-center gap-4 border-b px-3 last:border-0"
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={`c-${c}`} className="h-4 w-24" />
          ))}
        </div>
      ))}
    </div>
  );
}
