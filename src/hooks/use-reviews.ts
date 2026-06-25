import { api } from "@convex/_generated/api";
import type { Barbershop } from "@convex/schema";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

export function reviewsByBarbershopQueryOptions(
  barbershopId: Barbershop["_id"],
  limit?: number,
) {
  return convexQuery(api.reviews.getByBarbershop, { barbershopId, limit });
}

export function barbershopRatingQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.reviews.getBarbershopRating, { barbershopId });
}

export function myReviewsQueryOptions() {
  return convexQuery(api.reviews.getMine, {});
}

export function myReviewsNeedingAttentionCountQueryOptions() {
  return convexQuery(api.reviews.countMineNeedingAttention, {});
}

export function reviewInviteQueryOptions(code: string, barbershopUuid: string) {
  return convexQuery(api.reviews.getInvite, { code, barbershopUuid });
}

/** Live-updating list of the most recent published reviews for a barbershop. */
export function useReviewsByBarbershop(
  barbershopId: Barbershop["_id"],
  limit?: number,
) {
  return useSuspenseQuery(reviewsByBarbershopQueryOptions(barbershopId, limit));
}

/** Live-updating average rating + published-review count for a barbershop. */
export function useBarbershopRating(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(barbershopRatingQueryOptions(barbershopId));
}

/** The current user's own reviews across every moderation state. */
export function useMyReviews() {
  return useSuspenseQuery(myReviewsQueryOptions());
}

export function useReviewActions() {
  const createReviewMutation = useMutation({
    mutationFn: useConvexMutation(api.reviews.create),
  });

  const updateReviewMutation = useMutation({
    mutationFn: useConvexMutation(api.reviews.update),
  });

  const deleteReviewMutation = useMutation({
    mutationFn: useConvexMutation(api.reviews.deleteReview),
  });

  return { createReviewMutation, updateReviewMutation, deleteReviewMutation };
}
