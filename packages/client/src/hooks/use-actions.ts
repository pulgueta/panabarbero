import { convexQuery } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type { Id } from "@panabarbero/convex/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";

interface UseActionsProps {
  userId: string;
  barbershopId: Id<"barbershops">;
}

export function canReviewQueryOptions({
  barbershopId,
  userId,
}: UseActionsProps) {
  return convexQuery(api.reviews.canReview, { barbershopId, userId });
}

export function useCanReview({ barbershopId, userId }: UseActionsProps) {
  return useSuspenseQuery(canReviewQueryOptions({ barbershopId, userId })).data;
}
