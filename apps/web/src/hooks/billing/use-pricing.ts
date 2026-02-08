import { convexQuery } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import { useSuspenseQuery } from "@tanstack/react-query";

export function getPricingPlansQueryOptions() {
  return convexQuery(api.polar.listAllProducts, {});
}

export function usePricingPlans() {
  return useSuspenseQuery(getPricingPlansQueryOptions());
}
