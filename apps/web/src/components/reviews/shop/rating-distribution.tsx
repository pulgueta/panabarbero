import { StarIcon } from "@phosphor-icons/react";
import type { FC } from "react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShopReviewStats } from "@/hooks/use-reviews";

const STARS = [5, 4, 3, 2, 1] as const;

interface RatingDistributionProps {
  distribution: ShopReviewStats["distribution"];
}

/**
 * Per-star histogram of the published reviews. Pure-CSS bars with a neutral
 * fill so red stays the accent, not decoration. Each row is a labelled image
 * for AT ("5 estrellas: 12 reseñas").
 */
export const RatingDistribution: FC<RatingDistributionProps> = ({
  distribution,
}) => {
  const max = Math.max(1, ...STARS.map((star) => distribution[star]));

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Distribución</CardTitle>
      </CardHeader>
      <div className="space-y-2 px-4 py-4">
        {STARS.map((star) => {
          const count = distribution[star];

          return (
            <div
              key={star}
              role="img"
              aria-label={`${star} ${star === 1 ? "estrella" : "estrellas"}: ${count} ${count === 1 ? "reseña" : "reseñas"}`}
              className="flex items-center gap-3"
            >
              <span className="flex w-8 shrink-0 items-center gap-1 text-muted-foreground text-sm tabular-nums">
                {star}
                <StarIcon weight="fill" className="size-3 text-amber-500" />
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-muted-foreground/30"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-muted-foreground text-sm tabular-nums">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
