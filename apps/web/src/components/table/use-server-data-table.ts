import type {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useState } from "react";

export interface UseServerDataTableOptions<TData> {
  /** The accumulated `usePaginatedQuery().results`. */
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  getRowId?: (row: TData) => string;
  /**
   * Sorting / column-filter / global-filter state is OWNED by the section
   * because it becomes the Convex query args (changing args auto-resets the
   * paginated query to page 1). Pass the controlled state + setters here.
   */
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: OnChangeFn<ColumnFiltersState>;
  globalFilter: string;
  onGlobalFilterChange: OnChangeFn<string>;
  initialColumnVisibility?: VisibilityState;
}

const defaultGetRowId = <TData>(row: TData, index: number): string =>
  (row as { _id?: string })._id ?? String(index);

/**
 * Table engine for **server-driven** sections that page through Convex with
 * `usePaginatedQuery`. TanStack runs in manual mode (no client row-model
 * transforms); the section derives its Convex args from the sorting/filter
 * state below (debounce free-text search with `useDebouncedValue`), and passes
 * `{ status, loadMore }` as the `server` bag to `<DataTable>` so
 * `DataTablePagination` renders "Cargar más".
 *
 * Column visibility has no server implication, so it lives here.
 *
 * ```tsx
 * const [sorting, setSorting] = useState<SortingState>([]);
 * const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
 * const [globalFilter, setGlobalFilter] = useState("");
 * const debounced = useDebouncedValue(globalFilter, 300);
 * const { results, status, loadMore } = usePaginatedQuery(
 *   api.reviews.listForShop,
 *   { barbershop: { id }, search: debounced || undefined, rating: ratingFilter },
 *   { initialNumItems: 20 },
 * );
 * const table = useServerDataTable({ data: results, columns, sorting, onSortingChange: setSorting,
 *   columnFilters, onColumnFiltersChange: setColumnFilters, globalFilter, onGlobalFilterChange: setGlobalFilter });
 * return <DataTable table={table} server={{ status, loadMore, pageSize: 20 }}>…</DataTable>;
 * ```
 */
export function useServerDataTable<TData>({
  data,
  columns,
  getRowId,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  globalFilter,
  onGlobalFilterChange,
  initialColumnVisibility = {},
}: UseServerDataTableOptions<TData>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility,
  );

  return useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: -1,
    autoResetPageIndex: false,
    state: { sorting, columnFilters, globalFilter, columnVisibility },
    onSortingChange,
    onColumnFiltersChange,
    onGlobalFilterChange,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: getRowId
      ? (row) => getRowId(row)
      : (defaultGetRowId as (row: TData, index: number) => string),
  });
}
