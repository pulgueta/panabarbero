import type { FC } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

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

const chartConfig = {
  completed: {
    label: "Citas completadas",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

/** Monday-first display order over the JS `getUTCDay()` indexing (0 = domingo). */
const WEEKDAYS = [
  { index: 1, label: "lun", name: "lunes" },
  { index: 2, label: "mar", name: "martes" },
  { index: 3, label: "mié", name: "miércoles" },
  { index: 4, label: "jue", name: "jueves" },
  { index: 5, label: "vie", name: "viernes" },
  { index: 6, label: "sáb", name: "sábado" },
  { index: 0, label: "dom", name: "domingo" },
] as const;

interface WeekdayChartProps {
  /** Completed citas per weekday, indexed by JS `getUTCDay()` (0 = domingo). */
  byWeekday: number[];
  days: number;
}

/** Which weekdays concentrate the completed citas of the recent window. */
export const WeekdayChart: FC<WeekdayChartProps> = ({ byWeekday, days }) => {
  const data = WEEKDAYS.map((weekday) => ({
    label: weekday.label,
    name: weekday.name,
    completed: byWeekday[weekday.index] ?? 0,
  }));
  const hasData = data.some((point) => point.completed > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Citas por día de la semana</CardTitle>
        <CardDescription>Últimos {days} días</CardDescription>
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
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(_, payload) =>
                      String(payload[0]?.payload?.name ?? "")
                    }
                  />
                }
              />
              <Bar
                dataKey="completed"
                fill="var(--color-completed)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
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
