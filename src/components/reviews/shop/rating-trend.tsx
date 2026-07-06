import type { FC } from "react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ShopRatingTrendPoint } from "@/hooks/use-reviews";

const monthFormatter = new Intl.DateTimeFormat("es-CO", { month: "short" });

/** Short month label from a `YYYY-MM` key (e.g. `2026-07` → `jul`). */
function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthFormatter.format(new Date(year, monthNumber - 1, 1));
}

interface RatingTrendProps {
  points: ShopRatingTrendPoint[];
}

/**
 * Compact 6-month average-rating trend. CSS flex columns, bar height relative
 * to the busiest month's average. Static (no entrance motion) so it's
 * reduced-motion safe by construction. Bars are decorative; the chart carries a
 * single text alternative summarising every month.
 */
export const RatingTrend: FC<RatingTrendProps> = ({ points }) => {
  const maxAverage = Math.max(1, ...points.map((point) => point.average));

  const summary = points
    .map(
      (point) =>
        `${monthLabel(point.month)}: ${point.count > 0 ? point.average.toFixed(1) : "sin reseñas"}`,
    )
    .join(", ");

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Tendencia</CardTitle>
        <CardDescription>Promedio de los últimos 6 meses</CardDescription>
      </CardHeader>
      <div className="px-4 py-4">
        <div
          role="img"
          aria-label={`Promedio de calificación por mes. ${summary}`}
          className="flex h-28 items-end gap-2"
        >
          {points.map((point) => {
            const height =
              point.count > 0
                ? Math.max(6, (point.average / maxAverage) * 100)
                : 0;

            return (
              <div
                key={point.month}
                className="flex h-full flex-1 flex-col items-center gap-2"
              >
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    aria-hidden
                    className="w-full max-w-8 rounded-t-md bg-muted-foreground/30"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-muted-foreground text-xs capitalize">
                  {monthLabel(point.month)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
