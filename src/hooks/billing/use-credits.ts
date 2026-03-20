import { convexQuery } from "@convex-dev/react-query";
import type { Barbershop } from "@convex/schema";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";

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
