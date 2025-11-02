import {
  convexQuery,
  useConvexAction,
  useConvexMutation,
} from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type { Id } from "@panabarbero/convex/dataModel";
import { useMutation, useQuery } from "@tanstack/react-query";

export function createServiceMutationOptions() {
  return useConvexAction(api.services.createService);
}

export function updateServiceMutationOptions() {
  return useConvexMutation(api.services.updateService);
}

export function deleteServiceMutationOptions() {
  return useConvexMutation(api.services.deleteService);
}

export function servicesQueryOptions(barbershopId: Id<"barbershops">) {
  return convexQuery(api.services.getServicesByBarbershopId, { barbershopId });
}

export function useServicesFromBarbershop(barbershopId: Id<"barbershops">) {
  return useQuery(servicesQueryOptions(barbershopId));
}

export function useServiceActions() {
  const createServiceMutation = useMutation({
    mutationFn: createServiceMutationOptions(),
  });
  const updateServiceMutation = useMutation({
    mutationFn: updateServiceMutationOptions(),
  });
  const deleteServiceMutation = useMutation({
    mutationFn: deleteServiceMutationOptions(),
  });

  return {
    createServiceMutation,
    updateServiceMutation,
    deleteServiceMutation,
  };
}
