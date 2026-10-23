import type { FC } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

import { truncateLabel } from "@/components/analytics/chart-format";
import { inventoryCategoryLabels } from "@/components/inventory/labels";
import type { ChartTooltipFormatter } from "@/components/chart-tooltip";
import { payloadNumber, payloadText } from "@/components/chart-tooltip";
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
import type { InventoryOverviewRow } from "@/hooks/use-inventory";
import { formatCurrency } from "@/lib/utils";

const chartConfig = {
  value: {
    label: "Valor",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const TOP_LIMIT = 6;
const ROW_HEIGHT = 44;

interface CategoryBreakdownChartProps {
  rows: InventoryOverviewRow[];
  canManage: boolean;
}

const renderTooltipValue: ChartTooltipFormatter = (value, _name, item) => (
  <div className="flex w-full flex-col gap-1 leading-none">
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">Valor</span>
      <span className="font-medium font-mono text-foreground tabular-nums">
        {formatCurrency(Number(value))}
      </span>
    </div>
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">Productos</span>
      <span className="font-medium font-mono text-foreground tabular-nums">
        {payloadNumber(item, "items")}
      </span>
    </div>
  </div>
);

/**
 * Stock value concentrated by category (top 6, managers). Nominal categories
 * wear a single hue — the bar length already encodes the value.
 */
export const CategoryBreakdownChart: FC<CategoryBreakdownChartProps> = ({
  rows,
  canManage,
}) => {
  const byCategory = new Map<string, { value: number; items: number }>();

  for (const row of rows) {
    const label = inventoryCategoryLabels[row.category];
    const current = byCategory.get(label) ?? { value: 0, items: 0 };
    current.value += row.value ?? 0;
    current.items += 1;
    byCategory.set(label, current);
  }

  const entries: { name: string; value: number; items: number }[] = [];

  for (const [name, stats] of byCategory) {
    if (stats.value > 0) {
      entries.push({ name, ...stats });
    }
  }

  entries.sort((a, b) => b.value - a.value);
  const data = entries.slice(0, TOP_LIMIT);

  const hasValue = canManage && data.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Valor por categoría</CardTitle>
        <CardDescription>
          Dónde está concentrado el valor de tu stock
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasValue ? (
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
              <XAxis type="number" dataKey="value" hide />
              {/* Visible axis labels instead of in-bar labels: short bars
                  can't fit long category names inside themselves. */}
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
                      payloadText(payload[0], "name")
                    }
                    formatter={renderTooltipValue}
                  />
                }
              />
              <Bar
                dataKey="value"
                fill="var(--color-value)"
                radius={4}
                maxBarSize={28}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground text-sm">
              Aún no hay stock valorizado para desglosar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
