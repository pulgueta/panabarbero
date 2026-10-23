import type { Barbershop } from "@convex/schema";
import type { FC } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  formatDayLong,
  formatDayShort,
} from "@/components/analytics/chart-format";
import type { ChartTooltipFormatter } from "@/components/chart-tooltip";
import { payloadText } from "@/components/chart-tooltip";
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
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function isChartKey(name: unknown): name is keyof typeof chartConfig {
  return typeof name === "string" && Object.hasOwn(chartConfig, name);
}

interface SalesRevenueChartProps {
  barbershopId: Barbershop["_id"];
}

/** Retail revenue per Bogotá day over the last 30 days. */
const renderTooltipValue: ChartTooltipFormatter = (value, name) => (
  <div className="flex w-full items-center justify-between gap-2 leading-none">
    <span className="text-muted-foreground">
      {isChartKey(name) ? chartConfig[name].label : name}
    </span>
    <span className="font-medium font-mono text-foreground tabular-nums">
      {formatCurrency(Number(value))}
    </span>
  </div>
);

export const SalesRevenueChart: FC<SalesRevenueChartProps> = ({
  barbershopId,
}) => {
  const { data: metrics } = useSalesMetrics(barbershopId);
  const hasData = metrics.daily.some((point) => point.revenue > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos por día</CardTitle>
        <CardDescription>
          Ventas de productos en los últimos 30 días
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-64 w-full"
          >
            <BarChart data={metrics.daily} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={formatDayShort}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={(_, payload) =>
                      formatDayLong(payloadText(payload[0], "date"))
                    }
                    formatter={renderTooltipValue}
                  />
                }
              />
              <Bar
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Aún no hay ventas registradas en este período.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
