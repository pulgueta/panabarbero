import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type { Barbershop } from "@panabarbero/convex/schemas";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

export function barbersByBarbershopIdQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.barbershopMembers.getBarbersByBarbershopId, {
    barbershopId,
  });
}

export function isBarberQueryOptions(userId: string) {
  return convexQuery(api.barbershopMembers.isBarber, { userId });
}

export function barberByUserIdQueryOptions(userId: string) {
  return convexQuery(api.barbershopMembers.getBarbershopMemberByUserId, {
    userId,
  });
}

export function inviteBarberMutationOptions() {
  return useConvexMutation(api.barbershopMembers.inviteBarbershopMember);
}

export function useBarbersByBarbershopId(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(barbersByBarbershopIdQueryOptions(barbershopId));
}

export function useIsBarber(userId: string) {
  return useSuspenseQuery(isBarberQueryOptions(userId));
}

export function useBarberByUserId(userId: string) {
  return useSuspenseQuery(barberByUserIdQueryOptions(userId));
}

export function useBarberActions() {
  const inviteBarberMutation = useMutation({
    mutationFn: inviteBarberMutationOptions(),
  });

  return {
    inviteBarberMutation,
  };
}
