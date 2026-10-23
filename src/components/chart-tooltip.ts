import type { ComponentProps } from "react";

import type { ChartTooltipContent } from "@/components/ui/chart";

/** The `formatter` prop of `ChartTooltipContent`. */
export type ChartTooltipFormatter = NonNullable<
  ComponentProps<typeof ChartTooltipContent>["formatter"]
>;

/** A chart data row: every field the charts read is text or a number. */
type ChartRow = Partial<Record<string, string | number>>;

function isChartRow(value: unknown): value is ChartRow {
  return typeof value === "object" && value !== null;
}

/** Recharts types the tooltip row (`entry.payload`) as `any`. */
function payloadValue(
  entry: { payload?: unknown } | undefined,
  key: string,
): string | number | undefined {
  const row = entry?.payload;
  return isChartRow(row) ? row[key] : undefined;
}

/** Reads one tooltip row field as text; a missing field gives `""`. */
export function payloadText(
  entry: { payload?: unknown } | undefined,
  key: string,
): string {
  return String(payloadValue(entry, key) ?? "");
}

/** Reads one tooltip row field as a number; a missing field gives `0`. */
export function payloadNumber(
  entry: { payload?: unknown } | undefined,
  key: string,
): number {
  return Number(payloadValue(entry, key) ?? 0);
}
