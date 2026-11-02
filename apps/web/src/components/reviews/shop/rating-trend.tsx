import type { FC } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import type { ShopRatingTrendPoint } from "@/hooks/use-reviews";

const chartConfig = {
  average: {
    label: "Promedio",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface RatingTrendProps {
  points: ShopRatingTrendPoint[];
}

/**
 * Compact 6-month average-rating trend on a fixed 0–5 scale. Animations stay
 * off so the chart is reduced-motion safe by construction; a single text
 * alternative summarises every month.
 */
export const RatingTrend: FC<RatingTrendProps> = ({ points }) => {
  const summary = points
    .map(
      (point) =>
        `${formatMonthShort(point.month)}: ${point.count > 0 ? point.average.toFixed(1) : "sin reseñas"}`,
    )
    .join(", ");

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Tendencia</CardTitle>
        <CardDescription>Promedio de los últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          role="img"
          aria-label={`Promedio de calificación por mes. ${summary}`}
        >
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-28 w-full"
          >
            <BarChart data={points} margin={{ left: 4, right: 4 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatMonthShort}
              />
              <YAxis domain={[0, 5]} hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(_, payload) => {
                      const point = payload[0]?.payload as
                        | ShopRatingTrendPoint
                        | undefined;

                      return point
                        ? `${formatMonthLong(point.month)} · ${point.count} ${point.count === 1 ? "reseña" : "reseñas"}`
                        : "";
                    }}
                    formatter={(value) => (
                      <div className="flex w-full items-center justify-between gap-2 leading-none">
                        <span className="text-muted-foreground">Promedio</span>
                        <span className="font-medium font-mono text-foreground tabular-nums">
                          {Number(value).toFixed(1)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                dataKey="average"
                fill="var(--color-average)"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};
