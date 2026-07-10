import { api } from "@convex/_generated/api";
import type { Barbershop } from "@convex/schema";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";

export function getExtraCreditsQueryOptions() {
  return convexQuery(api.credits.getMyExtraCredits, {});
}

export function useExtraCredits() {
  return useSuspenseQuery(getExtraCreditsQueryOptions());
}

export function getBarbershopQuotaUsageQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.credits.getBarbershopQuotaUsage, { id: barbershopId });
}

export function useBarbershopQuotaUsage(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(getBarbershopQuotaUsageQueryOptions(barbershopId));
}
