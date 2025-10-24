import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type { Id } from "@panabarbero/convex/dataModel";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

export function createServiceMutationOptions() {
  return useConvexMutation(api.services.createService);
}

export function servicesQueryOptions(barbershopId: Id<"barbershops">) {
  return convexQuery(api.services.getServicesByBarbershopId, { barbershopId });
}

export function useServicesFromBarbershop(barbershopId: Id<"barbershops">) {
  return useSuspenseQuery(servicesQueryOptions(barbershopId));
}

export function useServiceActions() {
  const createService = useMutation({
    mutationFn: useConvexMutation(api.services.createService),
  });

  return { createService };
}
