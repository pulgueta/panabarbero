import type { Barbershop } from "@convex/schema";
import type { ComponentProps, FC } from "react";
import { useState } from "react";

import { inventoryMovementTypeData } from "@/components/inventory/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaginatedShopMovements } from "@/hooks/use-inventory";
import { cn, formatCurrency } from "@/lib/utils";

interface ShopMovementsPageProps {
  barbershopId: Barbershop["_id"];
  cursor: string | null;
  isLast: boolean;
  onLoadMore: (cursor: string) => void;
  numItems?: number;
  showLoadMore?: boolean;
}

const ShopMovementsPage: FC<ShopMovementsPageProps> = ({
  barbershopId,
  cursor,
  isLast,
  onLoadMore,
  numItems,
  showLoadMore = true,
}) => {
  const { data, isFetching } = usePaginatedShopMovements(
    barbershopId,
    cursor,
    numItems,
  );

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
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge variant={variant}>{label}</Badge>
                <span className="truncate font-medium text-sm">
                  {movement.itemName}
                </span>
              </div>

              {movement.reason && (
                <p className="text-muted-foreground text-xs">
                  {movement.reason}
                </p>
              )}

              {movement.type === "sale" &&
              typeof movement.salePriceAtTime === "number" ? (
                <p className="text-muted-foreground text-xs tabular-nums">
                  Precio de venta: {formatCurrency(movement.salePriceAtTime)}{" "}
                  c/u
                </p>
              ) : null}

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
                {movement.actorName ? ` · por ${movement.actorName}` : null}
              </p>
            </div>

            <span className="shrink-0 text-muted-foreground text-sm tabular-nums">
              {movement.quantity}
            </span>
          </div>
        );
      })}

      {showLoadMore && isLast && !data.isDone && (
        <div className="flex justify-center py-2">
          <Button
            variant="outline"
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

interface ShopMovementListProps extends ComponentProps<"div"> {
  barbershopId: Barbershop["_id"];
  pageSize?: number;
  showLoadMore?: boolean;
}

/**
 * Shop-wide movement ledger with cursor-accumulating "load more" — the
 * per-item variant lives in `movement-history.tsx`.
 */
export const ShopMovementList: FC<ShopMovementListProps> = ({
  barbershopId,
  pageSize,
  className,
  showLoadMore = true,
  ...props
}) => {
  const [cursors, setCursors] = useState<Array<string | null>>([null]);

  return (
    <div className={cn("space-y-1", className)} {...props}>
      {cursors.map((cursor, index) => (
        <ShopMovementsPage
          showLoadMore={showLoadMore}
          key={cursor ?? "first"}
          barbershopId={barbershopId}
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
