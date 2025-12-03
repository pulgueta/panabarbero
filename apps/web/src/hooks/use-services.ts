import {
  convexQuery,
  useConvexAction,
  useConvexMutation,
} from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type { Barbershop, Service } from "@panabarbero/convex/schemas";
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

export function serviceByIdQueryOptions(serviceId: Service["_id"]) {
  return convexQuery(api.services.getServiceById, { serviceId });
}

export function servicesByIdsQueryOptions(serviceIds: Service["_id"][]) {
  return convexQuery(api.services.getServicesByIds, { serviceIds });
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

export function useServiceById(serviceId: Service["_id"]) {
  return useSuspenseQuery(serviceByIdQueryOptions(serviceId));
}

export function useServicesByIds(serviceIds: Service["_id"][]) {
  return useSuspenseQuery(servicesByIdsQueryOptions(serviceIds));
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
