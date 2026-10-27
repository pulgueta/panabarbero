import { StarIcon } from "@phosphor-icons/react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * Whole-surface empty state. No action button — an owner can't author reviews;
 * they arrive after a client completes a service.
 */
export const ReviewsEmpty = () => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <StarIcon />
      </EmptyMedia>
      <EmptyTitle>Aún no tienes reseñas.</EmptyTitle>
      <EmptyDescription>
        Las reseñas se publican cuando un cliente completa un servicio y
        comparte su opinión.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);
