import type { FC } from "react";
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";

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
import { formatCurrency } from "@/lib/utils";

const chartConfig = {
  completed: {
    label: "Citas completadas",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const TOP_LIMIT = 5;
const ROW_HEIGHT = 44;

export interface BreakdownRow {
  name: string;
  completed: number;
  revenue: number;
}

interface TopBreakdownChartProps {
  title: string;
  description: string;
  rows: BreakdownRow[];
  emptyMessage: string;
}

/**
 * Top-5 horizontal comparison (barberos / servicios). Nominal categories wear
 * a single hue — the bar length already encodes the value. Revenue rides the
 * tooltip as context.
 */
export const TopBreakdownChart: FC<TopBreakdownChartProps> = ({
  title,
  description,
  rows,
  emptyMessage,
}) => {
  const data = rows.slice(0, TOP_LIMIT);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
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
              margin={{ left: 0, right: 44 }}
            >
              <XAxis type="number" dataKey="completed" hide />
              {/* Visible axis labels instead of in-bar labels: short bars
                  can't fit long names inside themselves. */}
              <YAxis
                type="category"
                dataKey="name"
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
                      String(payload[0]?.payload?.name ?? "")
                    }
                    formatter={(value, _name, item) => (
                      <div className="flex w-full flex-col gap-1 leading-none">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Citas</span>
                          <span className="font-medium font-mono text-foreground tabular-nums">
                            {Number(value).toLocaleString("es-CO")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">
                            Ingresos
                          </span>
                          <span className="font-medium font-mono text-foreground tabular-nums">
                            {formatCurrency(Number(item.payload?.revenue ?? 0))}
                          </span>
                        </div>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                dataKey="completed"
                fill="var(--color-completed)"
                radius={4}
                maxBarSize={28}
              >
                <LabelList
                  dataKey="completed"
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground text-sm">{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
