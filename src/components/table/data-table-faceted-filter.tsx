import { CheckIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useDataTableContext } from "./data-table";

export interface FacetedFilterOption {
  label: string;
  value: string;
  /** Optional leading marker (e.g. a status colour dot). Keep it meaningful. */
  icon?: ReactNode;
}

/**
 * Multi-select facet chip. Options come from the caller (a Convex query or a
 * fixed enum) — not TanStack faceting, which in server mode only sees the
 * loaded page. Counts, when the client model has them, come from
 * `getFacetedUniqueValues`. The faceted columns must declare an array-aware
 * `filterFn` (see `facetedFilterFn`).
 */
export function DataTableFacetedFilter<TData = unknown>({
  columnId,
  title,
  options,
}: {
  columnId: string;
  title: string;
  options: FacetedFilterOption[];
}) {
  const { table } = useDataTableContext<TData>();
  const column = table.getColumn(columnId);

  if (!column) {
    return null;
  }

  const facets = column.getFacetedUniqueValues();
  const selected = new Set((column.getFilterValue() as string[]) ?? []);

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    const arr = Array.from(next);
    column.setFilterValue(arr.length ? arr : undefined);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2 border-dashed">
            {title}
            {selected.size > 0 ? (
              <>
                <Separator orientation="vertical" className="mx-0.5 h-4" />
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal tabular-nums"
                >
                  {selected.size}
                </Badge>
              </>
            ) : null}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-56 gap-0 p-0">
        <div className="max-h-72 overflow-auto p-1">
          {options.map((option) => {
            const isSelected = selected.has(option.value);
            const count = facets.get(option.value);
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => toggle(option.value)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-hidden hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}
                >
                  {isSelected ? <CheckIcon className="size-3" /> : null}
                </span>
                {option.icon}
                <span className="flex-1">{option.label}</span>
                {count !== undefined ? (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {selected.size > 0 ? (
          <div className="border-t p-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => column.setFilterValue(undefined)}
            >
              Limpiar
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Array-aware filter function for faceted columns: keeps a row when its value
 * is one of the selected facet values. Set it as `filterFn` on any column a
 * `DataTableFacetedFilter` targets.
 */
export function facetedFilterFn(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: unknown,
): boolean {
  if (!Array.isArray(filterValue) || filterValue.length === 0) {
    return true;
  }
  return (filterValue as string[]).includes(String(row.getValue(columnId)));
}
