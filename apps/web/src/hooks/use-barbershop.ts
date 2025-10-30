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

export function barbershopAvailabilityQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.appointments.getBarbershopAvailability, {
    barbershopId,
  });
}

export function searchBarbershopsByNameQueryOptions(name: string) {
  return convexQuery(api.barbershops.getBarbershopsByName, { name });
}

export function useBarbershopByUuid(uuid: string) {
  return useSuspenseQuery(barbershopByUuidQueryOptions(uuid));
}

export function useActiveBarbershops(filters: BarbershopSearch) {
  return useSuspenseQuery(activeBarbershopsQueryOptions(filters));
}

export function useUserVisitedBarbershops(userId: string) {
  return useQuery(userVisitedBarbershopsQueryOptions(userId));
}

export function useSearchBarbershopsByName(name: string) {
  return useQuery(searchBarbershopsByNameQueryOptions(name));
}

export function useBarbershopAvailability(barbershopId: Barbershop["_id"]) {
  return useQuery(barbershopAvailabilityQueryOptions(barbershopId));
}

export function useBarbershopActions() {
  const createBarbershop = useMutation({
    mutationFn: useConvexMutation(api.barbershops.createBarbershop),
  });
  const updateBarbershop = useMutation({
    mutationFn: useConvexMutation(api.barbershops.updateBarbershop),
  });
  const updateBarbershopDayAvailability = useMutation({
    mutationFn: useConvexMutation(
      api.barbershops.updateBarbershopDayAvailability,
    ),
  });

  return {
    createBarbershop,
    updateBarbershop,
    updateBarbershopDayAvailability,
  };
}
