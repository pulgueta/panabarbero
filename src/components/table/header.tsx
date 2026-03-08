import { ArrowsDownUpIcon } from "@phosphor-icons/react";
import type { Column } from "@tanstack/react-table";
import type { FC } from "react";

import { Button } from "@/components/ui/button";

type ColumnHeader<T> = {
  column: Column<T>;
  header: string;
};

// biome-ignore lint/suspicious/noExplicitAny: needed
export const TableHeader: FC<ColumnHeader<any>> = ({ column, header }) => (
  <div className="text-center">
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {header}
      <ArrowsDownUpIcon className="ml-2 size-4" />
    </Button>
  </div>
);
