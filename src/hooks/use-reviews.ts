import { api } from "@convex/_generated/api";
import type { Barbershop } from "@convex/schema";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";

/** A single row in the owner-dashboard review feed (`reviews.listForShop`). */
export type ShopReviewRow = FunctionReturnType<
  typeof api.reviews.listForShop
>["page"][number];

/** Moderation/visibility status of a shop review. */
export type ShopReviewStatus = ShopReviewRow["status"];

/** Headline review stats (`reviews.getShopReviewStats`). */
export type ShopReviewStats = FunctionReturnType<
  typeof api.reviews.getShopReviewStats
>;

/** A single month point in the rating trend (`reviews.getShopRatingTrend`). */
export type ShopRatingTrendPoint = FunctionReturnType<
  typeof api.reviews.getShopRatingTrend
>[number];

/** Full breakdown payload (`reviews.getShopReviewBreakdown`). */
export type ShopReviewBreakdown = FunctionReturnType<
  typeof api.reviews.getShopReviewBreakdown
>;

/** Per-service breakdown row. */
export type ShopReviewServiceRow = ShopReviewBreakdown["byService"][number];

/** Per-barber breakdown row. */
export type ShopReviewBarberRow = ShopReviewBreakdown["byBarber"][number];

/** A single flagged review in the moderation queue (`reviews.getModerationQueue`). */
export type ModerationQueueRow = FunctionReturnType<
  typeof api.reviews.getModerationQueue
>[number];

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

// ---------------------------------------------------------------------------
// Owner-facing review analytics ("Reseñas" dashboard)
// ---------------------------------------------------------------------------

/** Filters for the owner review feed. `rating` and `status` are mutually exclusive; if both are set, the backend prefers `status`. */
export type ShopReviewsFilters = {
  rating?: number;
  status?: ShopReviewStatus;
};

/**
 * One page of the owner review feed. Cursor-based: pass the previous page's
 * `continueCursor` to advance.
 */
export function shopReviewsQueryOptions(
  barbershopId: Barbershop["_id"],
  filters?: ShopReviewsFilters,
  cursor: string | null = null,
  numItems = 20,
) {
  return convexQuery(api.reviews.listForShop, {
    barbershop: { id: barbershopId },
    rating: filters?.rating,
    status: filters?.status,
    paginationOpts: { cursor, numItems },
  });
}

export function shopReviewStatsQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.reviews.getShopReviewStats, {
    barbershop: { id: barbershopId },
  });
}

export function shopRatingTrendQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.reviews.getShopRatingTrend, {
    barbershop: { id: barbershopId },
  });
}

export function shopReviewBreakdownQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.reviews.getShopReviewBreakdown, {
    barbershop: { id: barbershopId },
  });
}

export function moderationQueueQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.reviews.getModerationQueue, {
    barbershop: { id: barbershopId },
  });
}

/** Live-updating, paginated review feed for the owner dashboard. */
export function useShopReviews(
  barbershopId: Barbershop["_id"],
  filters?: ShopReviewsFilters,
  cursor: string | null = null,
  numItems = 20,
) {
  return useQuery(
    shopReviewsQueryOptions(barbershopId, filters, cursor, numItems),
  );
}

/** Live-updating headline review stats (average, total, distribution, counts). */
export function useShopReviewStats(barbershopId: Barbershop["_id"]) {
  return useQuery(shopReviewStatsQueryOptions(barbershopId));
}

/** Live-updating 6-month rating trend. */
export function useShopRatingTrend(barbershopId: Barbershop["_id"]) {
  return useQuery(shopRatingTrendQueryOptions(barbershopId));
}

/** Live-updating rating breakdown by service and by barber. */
export function useShopReviewBreakdown(barbershopId: Barbershop["_id"]) {
  return useQuery(shopReviewBreakdownQueryOptions(barbershopId));
}

/** Live-updating flagged-review moderation queue (capped at 50). */
export function useModerationQueue(barbershopId: Barbershop["_id"]) {
  return useQuery(moderationQueueQueryOptions(barbershopId));
}
