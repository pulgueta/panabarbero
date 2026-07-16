import type { Barbershop } from "@convex/schema";
import type { FC } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

import { truncateLabel } from "@/components/analytics/chart-format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useSalesMetrics } from "@/hooks/use-inventory-sales";
import { formatCurrency } from "@/lib/utils";

const chartConfig = {
  revenue: {
    label: "Ingresos",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const ROW_HEIGHT = 44;

interface TopProductsChartProps {
  barbershopId: Barbershop["_id"];
}

/** Best sellers by revenue over the last 30 days. */
export const TopProductsChart: FC<TopProductsChartProps> = ({
  barbershopId,
}) => {
  const { data: metrics } = useSalesMetrics(barbershopId);
  const data = metrics.topProducts;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos más vendidos</CardTitle>
        <CardDescription>Por ingresos en los últimos 30 días</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto w-full"
            style={{ height: data.length * ROW_HEIGHT }}
          >
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 0, right: 12 }}
            >
              <XAxis type="number" dataKey="revenue" hide />
              <YAxis
                type="category"
                dataKey="itemName"
                tickLine={false}
                axisLine={false}
                width={130}
                tickFormatter={truncateLabel}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={(_, payload) =>
                      String(payload[0]?.payload?.itemName ?? "")
                    }
                    formatter={(value, _name, item) => (
                      <div className="flex w-full flex-col gap-1 leading-none">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">
                            Ingresos
                          </span>
                          <span className="font-medium font-mono text-foreground tabular-nums">
                            {formatCurrency(Number(value))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">
                            Unidades
                          </span>
                          <span className="font-medium font-mono text-foreground tabular-nums">
                            {Number(item.payload?.units ?? 0)}
                          </span>
                        </div>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={4}
                maxBarSize={28}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Aún no hay ventas para desglosar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
