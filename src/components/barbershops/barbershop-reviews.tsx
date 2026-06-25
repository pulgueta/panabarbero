import type { Barbershop } from "@convex/schema";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { FC } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { StarRating } from "@/components/ui/star-rating";
import {
  useBarbershopRating,
  useReviewsByBarbershop,
} from "@/hooks/use-reviews";

interface BarbershopReviewsProps {
  barbershopId: Barbershop["_id"];
}

export const BarbershopReviews: FC<BarbershopReviewsProps> = ({
  barbershopId,
}) => {
  const { data: rating } = useBarbershopRating(barbershopId);
  const { data: reviews } = useReviewsByBarbershop(barbershopId, 6);

  if (rating.count === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Aún no hay reseñas.</EmptyTitle>
          <EmptyDescription>
            Sé el primero en dejar una reseña después de tu visita.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <StarRating readOnly value={rating.average} />

        <p className="text-muted-foreground text-sm">
          <span className="font-semibold text-foreground">
            {rating.average.toFixed(1)}
          </span>{" "}
          ({rating.count} {rating.count === 1 ? "reseña" : "reseñas"})
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {reviews.map((review) => (
          <Card key={review._id} size="sm">
            <CardHeader>
              <StarRating
                readOnly
                value={review.rating}
                starClassName="size-4"
              />

              <CardTitle className="text-base">{review.authorName}</CardTitle>

              <p className="text-muted-foreground text-xs">
                {review.serviceName} ·{" "}
                <span suppressHydrationWarning>
                  {formatDistanceToNow(review._creationTime, {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </p>
            </CardHeader>

            {review.comment && (
              <CardContent>
                <p className="text-pretty text-sm leading-relaxed">
                  {review.comment}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
