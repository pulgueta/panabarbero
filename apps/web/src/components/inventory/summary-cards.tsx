import type { Barbershop } from "@convex/schema";
import type { FC } from "react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useLowStock,
  useMonthlyConsumption,
  useValuation,
} from "@/hooks/use-inventory";
import { cn, formatCurrency } from "@/lib/utils";

interface InventorySummaryCardsProps {
  barbershopId: Barbershop["_id"];
}

/** KPI strip for the inventory Resumen — managers only (valuation is money). */
export const InventorySummaryCards: FC<InventorySummaryCardsProps> = ({
  barbershopId,
}) => {
  const { data: valuation } = useValuation(barbershopId);
  const { data: lowStock } = useLowStock(barbershopId);
  const { data: monthlyConsumption } = useMonthlyConsumption(barbershopId);

  const lowStockCount = lowStock?.length ?? 0;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Valor del inventario</CardDescription>
          <CardTitle className="tabular-nums">
            {valuation ? formatCurrency(valuation.totalValue) : "—"}
          </CardTitle>
          {/* Durable assets are capital, not shelf stock — shown apart. */}
          {valuation && valuation.equipmentValue > 0 ? (
            <p className="text-muted-foreground text-xs tabular-nums">
              Equipos: {formatCurrency(valuation.equipmentValue)}
            </p>
          ) : null}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Bajo stock</CardDescription>
          <CardTitle
            className={cn("tabular-nums", lowStockCount > 0 && "text-warning")}
          >
            {lowStockCount}
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Movement counts, not quantity sums — quantities mix units (ml,
          und, cajas) across items and would add up to a meaningless number. */}
      <Card>
        <CardHeader>
          <CardDescription>Consumos del mes</CardDescription>
          <CardTitle className="tabular-nums">
            {monthlyConsumption?.consumedCount ?? 0}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Ventas del mes</CardDescription>
          <CardTitle className="tabular-nums">
            {monthlyConsumption?.soldCount ?? 0}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
};
