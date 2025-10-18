import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

export function activeBarbershopsQueryOptions() {
  return convexQuery(api.barbershops.getActiveBarbershops, {});
}

export function barbershopByUuidQueryOptions(uuid: string) {
  return convexQuery(api.barbershops.getBarbershopByUuid, { uuid });
}

export function useBarbershopByUuid(uuid: string) {
  return useSuspenseQuery(barbershopByUuidQueryOptions(uuid));
}

export function useActiveBarbershops() {
  return useSuspenseQuery(activeBarbershopsQueryOptions());
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
