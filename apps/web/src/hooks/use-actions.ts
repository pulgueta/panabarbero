import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";

interface UseCanReviewPayload {
  userId: string;
  barbershopId: Id<"barbershops">;
}

export function canReviewQueryOptions(payload: UseCanReviewPayload) {
  return convexQuery(api.reviews.canReview, payload);
}

export function useCanReview(payload: UseCanReviewPayload) {
  return useQuery(canReviewQueryOptions(payload)).data;
}
