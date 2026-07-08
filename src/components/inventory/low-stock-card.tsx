import type { Barbershop } from "@convex/schema";
import { WarningIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { formatInventoryStockSuffix } from "@/components/inventory/labels";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLowStock } from "@/hooks/use-inventory";

const LOW_STOCK_LIMIT = 6;

interface LowStockCardProps {
  barbershopId: Barbershop["_id"];
}

/** The items that need attention now — reorder-point breaches, worst first. */
export const LowStockCard: FC<LowStockCardProps> = ({ barbershopId }) => {
  const { data: lowStock, isPending } = useLowStock(barbershopId);

  const rows = (lowStock ?? [])
    .slice()
    .sort((a, b) => a.onHand - b.onHand)
    .slice(0, LOW_STOCK_LIMIT);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bajo stock</CardTitle>
        <CardDescription>
          Productos por debajo de su punto de pedido
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Todo el stock está por encima de su punto de pedido.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {rows.map((row) => (
              <div
                key={row.itemId}
                className="flex items-center justify-between gap-2 border-b py-2 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <WarningIcon className="size-4 shrink-0 text-warning" />
                  <span className="truncate text-sm">{row.name}</span>
                </div>
                <span className="shrink-0 text-muted-foreground text-sm tabular-nums">
                  {row.onHand} / {row.reorderPoint}{" "}
                  {formatInventoryStockSuffix(row.onHand, row.unit)}
                </span>
              </div>
            ))}

            {(lowStock?.length ?? 0) > LOW_STOCK_LIMIT && (
              <div className="flex justify-center pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link to="/profile/barbershops/inventory/products" />}
                >
                  Ver todos los productos
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
