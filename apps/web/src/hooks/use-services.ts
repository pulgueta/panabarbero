import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import type { Appointment, Barbershop, Service } from "@convex/tables";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";

export function createServiceOptions() {
  return useConvexMutation(api.services.create);
}

export function updateServiceMutationOptions() {
  return useConvexMutation(api.services.update);
}

export function servicesByBarbershopIdQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.barbershops.getServices, { barbershopId });
}

export function servicesPaginatedByBarbershopIdQueryOptions(
  barbershopId: Barbershop["_id"],
  cursor: string | null = null,
  numItems = 6,
) {
  return convexQuery(api.barbershops.getServicesPaginated, {
    barbershopId,
    paginationOpts: {
      cursor,
      numItems,
    },
  });
}

export function serviceByIdQueryOptions(serviceId: Service["_id"]) {
  return convexQuery(api.services.getById, { serviceId });
}

export function servicesByIdsQueryOptions(serviceIds: Service["_id"][]) {
  return convexQuery(api.services.getByIds, { serviceIds });
}

export function serviceByAppointmentIdQueryOptions(
  appointmentId: Appointment["_id"],
) {
  return convexQuery(api.services.getByAppointmentId, { appointmentId });
}

export function deleteServiceMutationOptions() {
  return useConvexMutation(api.services.deleteService);
}

export function servicesQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.barbershops.getServices, { barbershopId });
}

export function useServicesFromBarbershop(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(servicesQueryOptions(barbershopId));
}

export function usePaginatedServicesFromBarbershop(
  barbershopId: Barbershop["_id"],
  cursor: string | null,
  numItems = 6,
) {
  return useQuery(
    servicesPaginatedByBarbershopIdQueryOptions(barbershopId, cursor, numItems),
  );
}

export function useServiceById(serviceId: Service["_id"]) {
  return useSuspenseQuery(serviceByIdQueryOptions(serviceId));
}

export function useServicesByIds(serviceIds: Service["_id"][]) {
  return useSuspenseQuery(servicesByIdsQueryOptions(serviceIds));
}

export function useServiceByAppointmentId(appointmentId: Appointment["_id"]) {
  return useSuspenseQuery(serviceByAppointmentIdQueryOptions(appointmentId));
}

export function useServicesByBarbershopId(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(servicesByBarbershopIdQueryOptions(barbershopId));
}

export function useServiceActions() {
  const createServiceMutation = useMutation({
    mutationFn: createServiceOptions(),
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
