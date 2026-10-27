import { api } from "@convex/_generated/api";
import type { Appointment, Barbershop, Service } from "@convex/schema";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";

function useCreateServiceMutation() {
  return useConvexMutation(api.services.create);
}

function useUpdateServiceMutation() {
  return useConvexMutation(api.services.update);
}

function servicesByBarbershopIdQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.barbershops.getServices, { id: barbershopId });
}

export function servicesPaginatedByBarbershopIdQueryOptions(
  barbershopId: Barbershop["_id"],
  cursor: string | null = null,
  numItems = 6,
) {
  return convexQuery(api.barbershops.getServicesPaginated, {
    barbershop: {
      id: barbershopId,
    },
    paginationOpts: {
      cursor,
      numItems,
    },
  });
}

export function servicesByIdsQueryOptions(serviceIds: Service["_id"][]) {
  return convexQuery(api.services.getByIds, {
    serviceIds: serviceIds.map((id) => ({ id })),
  });
}

export function serviceByAppointmentIdQueryOptions(
  appointmentId: Appointment["_id"],
) {
  return convexQuery(api.services.getByAppointmentId, { id: appointmentId });
}

function useDeleteServiceMutation() {
  return useConvexMutation(api.services.deleteService);
}

export function servicesQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.barbershops.getServices, { id: barbershopId });
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
    mutationFn: useCreateServiceMutation(),
  });
  const updateServiceMutation = useMutation({
    mutationFn: useUpdateServiceMutation(),
  });
  const deleteServiceMutation = useMutation({
    mutationFn: useDeleteServiceMutation(),
  });

  return {
    createServiceMutation,
    updateServiceMutation,
    deleteServiceMutation,
  };
}
