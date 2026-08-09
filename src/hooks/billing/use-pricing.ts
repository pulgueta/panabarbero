import { api } from "@convex/_generated/api";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

/** Polar products keyed by the stable product keys in `convex/plans.ts`. */
export function getConfiguredProductsQueryOptions() {
  return convexQuery(api.polar.getConfiguredProducts, {});
}

export function useConfiguredProducts() {
  return useSuspenseQuery(getConfiguredProductsQueryOptions());
}

export function getSubscriptionQueryOptions() {
  return convexQuery(api.auth.getUserSubscription, {});
}

export function useSubscription() {
  return useSuspenseQuery(getSubscriptionQueryOptions());
}
