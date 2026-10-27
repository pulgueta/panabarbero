import type { FC } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  formatMonthLong,
  formatMonthShort,
} from "@/components/analytics/chart-format";
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
import type { AppointmentsTrendPoint } from "@/hooks/use-dashboard-analytics";
import { formatCurrency } from "@/lib/utils";

const chartConfig = {
  revenue: {
    label: "Ingresos",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

interface RevenueTrendChartProps {
  data: AppointmentsTrendPoint[];
}

/**
 * Estimated revenue (service price snapshotted at completion) per Bogotá
 * month over the last 6 months.
 */
export const RevenueTrendChart: FC<RevenueTrendChartProps> = ({ data }) => {
  const hasData = data.some((point) => point.revenue > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos estimados</CardTitle>
        <CardDescription>
          Según el precio del servicio al completar cada cita
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-56 w-full"
          >
            <BarChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatMonthShort}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={(_, payload) =>
                      formatMonthLong(String(payload[0]?.payload?.month ?? ""))
                    }
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-2 leading-none">
                        <span className="text-muted-foreground">
                          {chartConfig[name as keyof typeof chartConfig]
                            ?.label ?? name}
                        </span>
                        <span className="font-medium font-mono text-foreground tabular-nums">
                          {formatCurrency(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                dataKey="revenue"
                fill="var(--color-revenue)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-56 items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Aún no hay ingresos registrados en este período.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
