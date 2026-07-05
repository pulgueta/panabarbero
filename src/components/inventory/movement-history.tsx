import type { InventoryItem, InventoryUnit } from "@convex/schema";
import type { ComponentProps, FC, ReactElement } from "react";
import { useState } from "react";

import {
  formatInventoryStockSuffix,
  formatRemainingBalanceLabel,
  inventoryMovementTypeData,
  inventoryUnitSuffixes,
} from "@/components/inventory/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import { Skeleton } from "@/components/ui/skeleton";
import type { InventoryOverviewRow } from "@/hooks/use-inventory";
import { usePaginatedMovements } from "@/hooks/use-inventory";
import { cn } from "@/lib/utils";

interface MovementsPageProps {
  itemId: InventoryItem["_id"];
  unit: InventoryUnit;
  cursor: string | null;
  isLast: boolean;
  onLoadMore: (cursor: string) => void;
  numItems?: number;
}

const MovementsPage: FC<MovementsPageProps> = ({
  itemId,
  unit,
  cursor,
  isLast,
  onLoadMore,
  numItems,
}) => {
  const { data, isFetching } = usePaginatedMovements(itemId, cursor, numItems);

  if (!data) {
    return <Skeleton className="h-16 w-full" />;
  }

  return (
    <>
      {cursor === null && data.page.length === 0 && (
        <p className="py-6 text-center text-muted-foreground text-sm">
          Aún no hay movimientos registrados.
        </p>
      )}

      {data.page.map((movement) => {
        const { label, variant } = inventoryMovementTypeData[movement.type];

        return (
          <div
            key={movement._id}
            className="flex items-start justify-between gap-2 border-b py-2 last:border-b-0"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge variant={variant}>{label}</Badge>
                <span className="font-medium text-sm tabular-nums">
                  {movement.quantity} {inventoryUnitSuffixes[unit]}
                </span>
              </div>

              {movement.reason && (
                <p className="text-muted-foreground text-xs">
                  {movement.reason}
                </p>
              )}

              <p
                className="text-muted-foreground text-xs"
                suppressHydrationWarning
              >
                {new Date(movement._creationTime).toLocaleDateString("es-CO", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <span className="shrink-0 text-muted-foreground text-sm tabular-nums">
              {formatRemainingBalanceLabel(movement.balanceAfter)}{" "}
              {movement.balanceAfter}{" "}
              {formatInventoryStockSuffix(movement.balanceAfter, unit)}
            </span>
          </div>
        );
      })}

      {isLast && !data.isDone && (
        <div className="flex justify-center py-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => onLoadMore(data.continueCursor)}
          >
            Cargar más
          </Button>
        </div>
      )}
    </>
  );
};

interface InventoryMovementListProps extends ComponentProps<"div"> {
  itemId: InventoryItem["_id"];
  unit: InventoryUnit;
  pageSize?: number;
}

export const InventoryMovementList: FC<InventoryMovementListProps> = ({
  itemId,
  unit,
  pageSize,
  className,
  ...props
}) => {
  const [cursors, setCursors] = useState<Array<string | null>>([null]);

  return (
    <div className={cn("space-y-1", className)} {...props}>
      {cursors.map((cursor, index) => (
        <MovementsPage
          key={cursor ?? "first"}
          itemId={itemId}
          unit={unit}
          cursor={cursor}
          isLast={index === cursors.length - 1}
          numItems={pageSize}
          onLoadMore={(nextCursor) =>
            setCursors((prev) => [...prev, nextCursor])
          }
        />
      ))}
    </div>
  );
};

interface MovementHistoryProps {
  item: InventoryOverviewRow;
  trigger: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const MovementHistory: FC<MovementHistoryProps> = ({
  item,
  trigger,
  open,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <ResponsiveModal
      open={open ?? internalOpen}
      onOpenChange={handleOpenChange}
    >
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Historial de movimientos</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {`Movimientos registrados de "${item.name}".`}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <InventoryMovementList
          itemId={item._id}
          unit={item.unit}
          className="max-h-80 overflow-y-auto"
        />
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
