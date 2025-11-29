import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type { Barbershop } from "@panabarbero/convex/schemas";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

export function barbersByBarbershopIdQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.barbers.getBarbersByBarbershopId, { barbershopId });
}

export function isBarberQueryOptions(userId: string) {
  return convexQuery(api.barbers.isBarber, { userId });
}

export function inviteBarberMutationOptions() {
  return useConvexMutation(api.barbers.inviteBarber);
}

export function useBarbersByBarbershopId(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(barbersByBarbershopIdQueryOptions(barbershopId));
}

export function useIsBarber(userId: string) {
  return useSuspenseQuery(isBarberQueryOptions(userId));
}

export function useBarberActions() {
  const inviteBarberMutation = useMutation({
    mutationFn: inviteBarberMutationOptions(),
  });

  return {
    inviteBarberMutation,
  };
}
