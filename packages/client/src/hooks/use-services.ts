import { convexQuery } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type { Id } from "@panabarbero/convex/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";

export function servicesQueryOptions(barbershopId: Id<"barbershops">) {
  return convexQuery(api.services.getServicesByBarbershopId, { barbershopId });
}

export function useServicesFromBarbershop(barbershopId: Id<"barbershops">) {
  return useSuspenseQuery(servicesQueryOptions(barbershopId));
}
