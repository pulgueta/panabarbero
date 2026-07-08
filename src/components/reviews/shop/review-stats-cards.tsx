import type { FC } from "react";

import { DashboardPageStats } from "@/components/dashboard/dashboard-page";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import type { ShopReviewStats } from "@/hooks/use-reviews";
import { cn } from "@/lib/utils";

interface ReviewStatsCardsProps {
  stats: ShopReviewStats;
}

/** Headline KPI strip — mirrors the inventory summary-card pattern. */
export const ReviewStatsCards: FC<ReviewStatsCardsProps> = ({ stats }) => {
  const fivePct =
    stats.publishedCount > 0
      ? Math.round((stats.distribution[5] / stats.publishedCount) * 100)
      : 0;

  return (
    <DashboardPageStats>
      <Card>
        <CardHeader>
          <CardDescription>Calificación promedio</CardDescription>
          <CardTitle className="tabular-nums">
            {stats.average > 0 ? stats.average.toFixed(1) : "—"}
          </CardTitle>
          <StarRating
            readOnly
            value={stats.average}
            starClassName="size-4"
            className="pt-1"
          />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Reseñas publicadas</CardDescription>
          <CardTitle className="tabular-nums">{stats.publishedCount}</CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Marcadas</CardDescription>
          <CardTitle
            className={cn(
              "tabular-nums",
              stats.flaggedCount > 0 && "text-warning",
            )}
          >
            {stats.flaggedCount}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>% de 5★</CardDescription>
          <CardTitle className="tabular-nums">
            {stats.publishedCount > 0 ? `${fivePct}%` : "—"}
          </CardTitle>
        </CardHeader>
      </Card>
    </DashboardPageStats>
  );
};
