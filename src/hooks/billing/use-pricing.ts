import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";

export function getPricingPlansQueryOptions() {
  return convexQuery(api.polar.listAllProducts, {});
}

export function usePricingPlans() {
  return useSuspenseQuery(getPricingPlansQueryOptions());
}

export function getSubscriptionQueryOptions() {
  return convexQuery(api.auth.getUserSubscription, {});
}

export function useSubscription() {
  return useSuspenseQuery(getSubscriptionQueryOptions());
}
