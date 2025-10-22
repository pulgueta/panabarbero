import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";

import type { BarbershopSearch } from "@/routes/barbershops";

export function activeBarbershopsQueryOptions(filters: BarbershopSearch) {
  return convexQuery(api.barbershops.getActiveBarbershops, filters);
}

export function barbershopByUuidQueryOptions(uuid: string) {
  return convexQuery(api.barbershops.getBarbershopByUuid, { uuid });
}

export function useBarbershopByUuid(uuid: string) {
  return useSuspenseQuery(barbershopByUuidQueryOptions(uuid));
}

export function useActiveBarbershops(filters: BarbershopSearch) {
  return useQuery(activeBarbershopsQueryOptions(filters));
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
