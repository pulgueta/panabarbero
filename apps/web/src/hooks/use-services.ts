import {
  convexQuery,
  useConvexAction,
  useConvexMutation,
} from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type { Barbershop } from "@panabarbero/convex/schemas";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

export function createServiceMutationOptions() {
  return useConvexAction(api.services.createService);
}

export function updateServiceMutationOptions() {
  return useConvexMutation(api.services.updateService);
}

export function servicesByBarbershopIdQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.services.getServicesByBarbershopId, { barbershopId });
}

export function deleteServiceMutationOptions() {
  return useConvexMutation(api.services.deleteService);
}

export function servicesQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.services.getServicesByBarbershopId, { barbershopId });
}

export function useServicesFromBarbershop(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(servicesQueryOptions(barbershopId));
}

export function useServicesByBarbershopId(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(servicesByBarbershopIdQueryOptions(barbershopId));
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
