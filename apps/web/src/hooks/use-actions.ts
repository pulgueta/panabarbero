import { convexQuery } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type { Id } from "@panabarbero/convex/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";

interface UseCanReviewPayload {
  userId: string;
  barbershopId: Id<"barbershops">;
}

export function canReviewQueryOptions(payload: UseCanReviewPayload) {
  return convexQuery(api.reviews.canReview, payload);
}

export function useCanReview(payload: UseCanReviewPayload) {
  return useSuspenseQuery(canReviewQueryOptions(payload)).data;
}
