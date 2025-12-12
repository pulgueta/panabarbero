import { convexQuery } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import { useSuspenseQuery } from "@tanstack/react-query";

export function reviewsByUserQueryOptions(userId: string) {
  return convexQuery(api.reviews.getReviewsByUserId, { userId });
}

export function useReviewsByUser(userId: string) {
  return useSuspenseQuery(reviewsByUserQueryOptions(userId));
}
