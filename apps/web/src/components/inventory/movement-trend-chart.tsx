import type { Barbershop } from "@convex/schema";
import type { FC } from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useMovementTrend } from "@/hooks/use-inventory";

const chartConfig = {
  consumption: {
    label: "Consumos",
    color: "var(--chart-1)",
  },
  sale: {
    label: "Ventas",
    color: "var(--chart-2)",
  },
  receipt: {
    label: "Recepciones",
    color: "var(--chart-3)",
  },
  waste: {
    label: "Mermas",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

const SERIES = Object.keys(chartConfig) as (keyof typeof chartConfig)[];

interface MovementTrendChartProps {
  barbershopId: Barbershop["_id"];
}

/**
 * Inventory activity per Bogotá month — counts of movements by type, not
 * quantity sums (quantities mix ml, und and cajas across items).
 */
export const MovementTrendChart: FC<MovementTrendChartProps> = ({
  barbershopId,
}) => {
  const { data, isPending } = useMovementTrend(barbershopId);

  const hasData =
    data?.some((point) => SERIES.some((series) => point[series] > 0)) ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad del inventario</CardTitle>
        <CardDescription>
          Movimientos por mes en los últimos 6 meses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : hasData ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-96 w-full"
          >
            <LineChart data={data} margin={{ left: 12, right: 12 }}>
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
                    indicator="line"
                    labelFormatter={(_, payload) =>
                      formatMonthLong(String(payload[0]?.payload?.month ?? ""))
                    }
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {SERIES.map((series) => (
                <Line
                  key={series}
                  dataKey={series}
                  type="monotone"
                  stroke={`var(--color-${series})`}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Aún no hay movimientos registrados en este período.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
