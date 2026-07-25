import type { Barbershop } from "@convex/schema";
import { StarIcon } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { FC } from "react";

import { WriteReviewCta } from "@/components/reviews/write-review-cta";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { StarRating } from "@/components/ui/star-rating";
import {
  useBarbershopRating,
  useBarbershopRatingDistribution,
  useReviewsByBarbershop,
} from "@/hooks/use-reviews";
import { getInitials } from "@/lib/utils";

const STARS_DESC = [5, 4, 3, 2, 1] as const;

interface BarbershopReviewsProps {
  barbershopId: Barbershop["_id"];
  isAuthed: boolean;
}

/** Detail-page reviews card: average + per-star histogram + latest reviews. */
export const BarbershopReviews: FC<BarbershopReviewsProps> = ({
  barbershopId,
  isAuthed,
}) => {
  const { data: rating } = useBarbershopRating(barbershopId);
  const { data: distribution } = useBarbershopRatingDistribution(barbershopId);
  const { data: reviews } = useReviewsByBarbershop(barbershopId, 6);

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pt-4 pb-3">
        <h2 className="font-semibold tracking-tight">Reseñas</h2>
        <WriteReviewCta barbershopId={barbershopId} isAuthed={isAuthed} />
      </div>

      {rating.count === 0 ? (
        <Empty className="border-t">
          <EmptyHeader>
            <EmptyTitle>Aún no hay reseñas.</EmptyTitle>
            <EmptyDescription>
              Sé el primero en dejar una reseña después de tu visita.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 border-t px-4 py-4">
            <div className="flex flex-col items-center gap-1">
              <span className="font-semibold text-4xl tabular-nums leading-none tracking-tight">
                {rating.average.toFixed(1)}
              </span>
              <StarRating
                readOnly
                starClassName="size-3.5"
                value={rating.average}
              />
              <span className="text-muted-foreground text-xs tabular-nums">
                {rating.count} {rating.count === 1 ? "reseña" : "reseñas"}
              </span>
            </div>

            <div className="min-w-52 flex-1 space-y-1.5">
              {STARS_DESC.map((star) => {
                const percentage = Math.round(
                  ((distribution[star] ?? 0) / rating.count) * 100,
                );

                return (
                  <div className="flex items-center gap-2" key={star}>
                    <span className="w-2 text-right text-muted-foreground text-xs tabular-nums">
                      {star}
                    </span>
                    <StarIcon className="size-3 text-amber-500" weight="fill" />
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-9 text-right text-muted-foreground text-xs tabular-nums">
                      {percentage} %
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {reviews.map((review) => (
            <div className="space-y-1.5 border-t px-4 py-3.5" key={review._id}>
              <div className="flex items-center gap-2.5">
                <Avatar>
                  <AvatarFallback>
                    {getInitials(review.authorName)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0">
                  <p className="truncate font-semibold text-sm">
                    {review.authorName}
                  </p>
                  <p className="truncate text-muted-foreground text-xs">
                    {review.serviceName} ·{" "}
                    <span suppressHydrationWarning>
                      {formatDistanceToNow(review._creationTime, {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  </p>
                </div>

                <StarRating
                  className="ml-auto shrink-0"
                  readOnly
                  starClassName="size-3"
                  value={review.rating}
                />
              </div>

              {review.comment && (
                <p className="text-pretty text-sm leading-relaxed">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </>
      )}
    </Card>
  );
};
