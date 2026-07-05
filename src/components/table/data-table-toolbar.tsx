import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDataTableContext } from "./data-table";

interface DataTableToolbarProps extends PropsWithChildren {
  className?: string;
}

/** Filter/action row above the table. Compose Search, FacetedFilter, Reset, and ViewOptions inside it. */
export function DataTableToolbar({
  children,
  className,
}: DataTableToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  );
}

/** Global free-text search. Instant for client tables; server tables debounce the value before querying. */
export function DataTableSearch({
  placeholder = "Buscar…",
  className,
}: {
  placeholder?: string;
  className?: string;
}) {
  const { table } = useDataTableContext();
  const value = (table.getState().globalFilter as string | undefined) ?? "";

  return (
    <InputGroup className={cn("h-8 w-full sm:max-w-64", className)}>
      <InputGroupAddon>
        <MagnifyingGlassIcon />
      </InputGroupAddon>
      <InputGroupInput
        placeholder={placeholder}
        value={value}
        onChange={(event) => table.setGlobalFilter(event.target.value)}
      />
    </InputGroup>
  );
}

/** Clears every column filter + the search. Renders nothing when no filter is active. */
export function DataTableReset({ label = "Limpiar" }: { label?: string }) {
  const { table } = useDataTableContext();
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    Boolean(table.getState().globalFilter);

  if (!isFiltered) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        table.resetColumnFilters();
        table.setGlobalFilter("");
      }}
    >
      {label}
    </Button>
  );
}

/** Column-visibility menu. Pushed to the right of the toolbar; hidden when no column is hideable. */
export function DataTableViewOptions({
  labels,
  title = "Columnas",
}: {
  labels?: Record<string, string>;
  title?: string;
}) {
  const { table } = useDataTableContext();
  const hideable = table
    .getAllColumns()
    .filter((column) => column.getCanHide());

  if (hideable.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="ml-auto">
            {title}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-48 gap-0 p-1">
        {hideable.map((column) => (
          <button
            type="button"
            key={column.id}
            onClick={() => column.toggleVisibility(!column.getIsVisible())}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-hidden hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                column.getIsVisible()
                  ? "border-primary bg-primary"
                  : "border-input",
              )}
            >
              {column.getIsVisible() ? (
                <span className="size-1.5 rounded-[1px] bg-primary-foreground" />
              ) : null}
            </span>
            {labels?.[column.id] ?? column.id}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
