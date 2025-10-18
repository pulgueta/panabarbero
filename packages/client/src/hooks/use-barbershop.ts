import { convexQuery } from "@convex-dev/react-query";
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
    mutationFn: api.barbershops.createBarbershop,
  });
  const updateBarbershop = useMutation({
    mutationFn: api.barbershops.updateBarbershop,
  });
  const updateBarbershopDayAvailability = useMutation({
    mutationFn: api.barbershops.updateBarbershopDayAvailability,
  });

  return {
    createBarbershop,
    updateBarbershop,
    updateBarbershopDayAvailability,
  };
}
