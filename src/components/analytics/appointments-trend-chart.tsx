import type { FC } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

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

const chartConfig = {
  completed: {
    label: "Citas completadas",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface AppointmentsTrendChartProps {
  data: AppointmentsTrendPoint[];
}

/** Completed citas per Bogotá month over the last 6 months. */
export const AppointmentsTrendChart: FC<AppointmentsTrendChartProps> = ({
  data,
}) => {
  const hasData = data.some((point) => point.completed > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Citas completadas</CardTitle>
        <CardDescription>Últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-56 w-full"
          >
            <AreaChart data={data} margin={{ left: 12, right: 12 }}>
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
                    indicator="dot"
                    labelFormatter={(_, payload) =>
                      formatMonthLong(String(payload[0]?.payload?.month ?? ""))
                    }
                  />
                }
              />
              <defs>
                <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-completed)"
                    stopOpacity={0.6}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-completed)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <Area
                dataKey="completed"
                type="monotone"
                fill="url(#fillCompleted)"
                stroke="var(--color-completed)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-56 items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Aún no hay citas completadas en este período.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
