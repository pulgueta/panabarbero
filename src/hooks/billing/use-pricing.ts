import { api } from "@convex/_generated/api";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

export function getPricingPlansQueryOptions() {
  return convexQuery(api.polar.listAllProducts, {});
}

export function usePricingPlans() {
  return useSuspenseQuery(getPricingPlansQueryOptions());
}

export function getConfiguredProductsQueryOptions() {
  return convexQuery(api.polar.getConfiguredProducts, {});
}

/** Products keyed by their stable config key (e.g. `extraWhatsApp`). */
export function useConfiguredProducts() {
  return useSuspenseQuery(getConfiguredProductsQueryOptions());
}

export function getSubscriptionQueryOptions() {
  return convexQuery(api.auth.getUserSubscription, {});
}

export function useSubscription() {
  return useSuspenseQuery(getSubscriptionQueryOptions());
}
