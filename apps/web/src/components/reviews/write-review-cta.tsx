import type { Barbershop } from "@convex/schema";
import { useQuery } from "@tanstack/react-query";
import type { FC } from "react";

import { ReviewDialog } from "@/components/reviews/review-dialog";
import { Button } from "@/components/ui/button";
import { reviewableForBarbershopQueryOptions } from "@/hooks/use-reviews";

interface WriteReviewCtaProps {
  barbershopId: Barbershop["_id"];
  isAuthed: boolean;
}

export const WriteReviewCta: FC<WriteReviewCtaProps> = ({
  barbershopId,
  isAuthed,
}) => {
  const { data: reviewable, isPending } = useQuery(
    reviewableForBarbershopQueryOptions(barbershopId),
  );

  if (!isAuthed) {
    return (
      <p className="text-muted-foreground text-sm">
        Inicia sesión y completa una cita para dejar tu reseña.
      </p>
    );
  }

  if (isPending) {
    return null;
  }

  if (!reviewable) {
    return (
      <p className="text-muted-foreground text-sm">
        Completa una cita en esta barbería para dejar tu reseña.
      </p>
    );
  }

  return (
    <ReviewDialog
      appointmentId={reviewable.appointmentId}
      serviceName={reviewable.serviceName}
      trigger={<Button size="sm">Deja tu reseña</Button>}
    />
  );
};
