import type {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  TableOptions,
  VisibilityState,
} from "@tanstack/react-table";
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";

export interface UseDataTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  /** Stable row identity — defaults to a Convex `_id` when present. */
  getRowId?: (row: TData) => string;
  /** Client-side page size. Ignored when the section drives pagination on the server. */
  pageSize?: number;
  initialSorting?: SortingState;
  initialColumnVisibility?: VisibilityState;
  /** Escape hatch for column-specific config (sizes, filterFns, meta). */
  tableOptions?: Partial<TableOptions<TData>>;
}

/** Convex rows carry a string `_id`, the default stable row identity. */
export function hasStringId(row: unknown): row is { _id: string } {
  return (
    typeof row === "object" &&
    row !== null &&
    "_id" in row &&
    typeof row._id === "string"
  );
}

/**
 * Client-side table engine: the section holds the full dataset in memory and
 * TanStack does the sorting / filtering / faceting / pagination. Use for
 * complete result sets (inventory overview, team, services). Server-paginated
 * sections instead build the table in manual mode and pass a `server` bag to
 * `<DataTable>`; the compound slots read whichever is present from context.
 */
export function useDataTable<TData>({
  data,
  columns,
  getRowId,
  pageSize = 10,
  initialSorting = [],
  initialColumnVisibility = {},
  tableOptions,
}: UseDataTableOptions<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility,
  );

  // oxlint-disable-next-line react/incompatible-library -- TanStack Table v8 returns a mutable instance by design; the React Compiler just skips memoizing this hook.
  return useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter, columnVisibility },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    globalFilterFn: "includesString",
    getRowId: getRowId
      ? (row) => getRowId(row)
      : (row, index) => (hasStringId(row) ? row._id : String(index)),
    initialState: { pagination: { pageSize } },
    ...tableOptions,
  });
}
