import { DotsThreeVerticalIcon } from "@phosphor-icons/react";
import { Fragment, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RowAction {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  variant?: "default" | "destructive";
  disabled?: boolean;
  /** Draw a divider above this item (e.g. before a destructive action). */
  separatorBefore?: boolean;
}

/**
 * Data-driven row actions menu. Each section passes its own verbs; there are no
 * per-section component variants. The trigger is the only affordance icon.
 */
interface DataTableRowActionsProps {
  label: string;
  actions: RowAction[];
}

export function DataTableRowActions({
  label,
  actions,
}: DataTableRowActionsProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={label}>
            <DotsThreeVerticalIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-44">
        {actions.map((action) => (
          <Fragment key={action.label}>
            {action.separatorBefore ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              variant={action.variant}
              disabled={action.disabled}
              onClick={action.onSelect}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
