import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type { Barbershop } from "@panabarbero/convex/schemas";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";

import type { BarbershopSearch } from "@/routes/barbershops";

export type BarbershopAvailabilityPayload = {
  barbershopId: Barbershop["_id"];
  date: number;
};

export function activeBarbershopsQueryOptions(filters: BarbershopSearch) {
  return convexQuery(api.barbershops.getActiveBarbershops, filters);
}

export function barbershopByUuidQueryOptions(uuid: string) {
  return convexQuery(api.barbershops.getBarbershopByUuid, { uuid });
}

export function userVisitedBarbershopsQueryOptions(userId: string) {
  return convexQuery(api.barbershops.getUserVisitedBarbershops, { userId });
}

export function isBarbershopOwnerQueryOptions(
  barbershopId: Barbershop["_id"],
  userId: string,
) {
  return convexQuery(api.barbershops.isBarbershopOwner, {
    barbershopId,
    userId,
  });
}

export function barbershopsByIdsQueryOptions(
  barbershopIds: Barbershop["_id"][],
) {
  return convexQuery(api.barbershops.getBarbershopsByIds, { barbershopIds });
}

export function barbershopsByOwnerIdQueryOptions(userId: string) {
  return convexQuery(api.barbershops.getBarbershopsByOwnerId, { userId });
}

export function barbershopAvailabilityQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.appointments.getBarbershopAvailability, {
    barbershopId,
  });
}

export function searchBarbershopsByNameQueryOptions(name?: string) {
  return convexQuery(api.barbershops.getBarbershopsByName, { name });
}

export function barbershopByIdQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.barbershops.getBarbershopById, { barbershopId });
}

export function barbershopByOwnerIdQueryOptions(ownerId: string) {
  return convexQuery(api.barbershops.getBarbershopByOwnerId, { ownerId });
}

export function useBarbershopByUuid(uuid: string) {
  return useSuspenseQuery(barbershopByUuidQueryOptions(uuid));
}

export function useActiveBarbershops(filters: BarbershopSearch) {
  return useQuery(activeBarbershopsQueryOptions(filters));
}

export function useIsBarbershopOwner(
  barbershopId: Barbershop["_id"],
  userId: string,
) {
  return useSuspenseQuery(isBarbershopOwnerQueryOptions(barbershopId, userId));
}

export function useUserVisitedBarbershops(userId: string) {
  return useQuery(userVisitedBarbershopsQueryOptions(userId));
}

export function useBarbershopsByIds(barbershopIds: Barbershop["_id"][]) {
  return useSuspenseQuery(barbershopsByIdsQueryOptions(barbershopIds));
}

export function useSearchBarbershopsByName(name: string) {
  return useQuery(searchBarbershopsByNameQueryOptions(name));
}

export function useBarbershopByOwnerId(ownerId: string) {
  return useQuery(barbershopByOwnerIdQueryOptions(ownerId));
}

export function useBarbershopAvailability(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(barbershopAvailabilityQueryOptions(barbershopId));
}

export function useBarbershopById(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(barbershopByIdQueryOptions(barbershopId));
}

export function useBarbershopsByOwnerId(userId: string) {
  return useSuspenseQuery(barbershopsByOwnerIdQueryOptions(userId));
}

export function useBarbershopActions() {
  const createBarbershopMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershops.createBarbershop),
  });
  const updateBarbershopMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershops.updateBarbershop),
  });
  const updateBarbershopDayAvailabilityMutation = useMutation({
    mutationFn: useConvexMutation(
      api.barbershops.updateBarbershopDayAvailability,
    ),
  });
  const updateBarbershopAvailabilityMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershops.updateBarbershopAvailability),
  });

  return {
    createBarbershopMutation,
    updateBarbershopMutation,
    updateBarbershopDayAvailabilityMutation,
    updateBarbershopAvailabilityMutation,
  };
}
