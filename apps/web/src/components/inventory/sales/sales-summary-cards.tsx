import type { Barbershop } from "@convex/schema";
import type { FC } from "react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSalesMetrics } from "@/hooks/use-inventory-sales";
import { formatCurrency } from "@/lib/utils";

interface SalesSummaryCardsProps {
  barbershopId: Barbershop["_id"];
}

/** KPI strip for the sales dashboard — current Bogotá month. */
export const SalesSummaryCards: FC<SalesSummaryCardsProps> = ({
  barbershopId,
}) => {
  const { data: metrics } = useSalesMetrics(barbershopId);
  const { month, previousMonth } = metrics;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Ingresos del mes</CardDescription>
          <CardTitle className="tabular-nums">
            {formatCurrency(month.revenue)}
          </CardTitle>
          <p className="text-muted-foreground text-xs tabular-nums">
            Mes anterior: {formatCurrency(previousMonth.revenue)}
          </p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Ventas del mes</CardDescription>
          <CardTitle className="tabular-nums">{month.saleCount}</CardTitle>
          <p className="text-muted-foreground text-xs tabular-nums">
            Mes anterior: {previousMonth.saleCount}
          </p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Productos vendidos</CardDescription>
          <CardTitle className="tabular-nums">{month.unitsSold}</CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Ticket promedio</CardDescription>
          <CardTitle className="tabular-nums">
            {formatCurrency(month.averageTicket)}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
};
