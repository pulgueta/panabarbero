import {
  ArrowDownIcon,
  ArrowsDownUpIcon,
  ArrowUpIcon,
} from "@phosphor-icons/react";
import type { Column } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Sortable column header. Left-aligned text by default, `align="end"` for
 * numeric columns (DESIGN.md §7). Non-sortable columns render as plain muted
 * text. The sort caret is the only icon — it carries state (sortable +
 * direction), not decoration.
 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  align = "start",
  className,
}: {
  column: Column<TData, TValue>;
  title: string;
  align?: "start" | "end";
  className?: string;
}) {
  if (!column.getCanSort()) {
    return (
      <span
        className={cn(
          "font-medium text-sm",
          align === "end" && "block text-right",
          className,
        )}
      >
        {title}
      </span>
    );
  }

  const sorted = column.getIsSorted();
  const Caret =
    sorted === "asc" ? ArrowUpIcon : sorted === "desc" ? ArrowDownIcon : null;

  return (
    <div className={cn("flex", align === "end" && "justify-end")}>
      <Button
        variant="ghost"
        size="sm"
        onClick={column.getToggleSortingHandler()}
        className={cn(
          "-mx-2 h-8 gap-1.5 font-medium text-muted-foreground hover:text-foreground data-sorted:text-foreground",
          className,
        )}
        data-sorted={sorted ? "" : undefined}
      >
        {title}
        {Caret ? (
          <Caret className="size-3.5" />
        ) : (
          <ArrowsDownUpIcon className="size-3.5 opacity-50" />
        )}
      </Button>
    </div>
  );
}
