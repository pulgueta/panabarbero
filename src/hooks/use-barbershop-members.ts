import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import type { Barbershop, BarbershopMember, Service } from "@convex/schema";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";

export function barbershopMembersByBarbershopIdQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.barbershopMembers.getByBarbershopId, {
    id: barbershopId,
  });
}

export function servicesForBarberQueryOptions(
  barbershopMemberId: BarbershopMember["_id"],
) {
  return convexQuery(api.barbershopMemberServices.getServicesForBarber, {
    id: barbershopMemberId,
  });
}

export function barbersForServiceQueryOptions(serviceId: Service["_id"]) {
  return convexQuery(api.barbershopMemberServices.getBarbersForService, {
    id: serviceId,
  });
}

export function isBarberQueryOptions(userId: string) {
  return convexQuery(api.barbershopMembers.isBarber, { userId });
}

export function barberByUserIdQueryOptions(userId: string) {
  return convexQuery(api.barbershopMembers.getByUserId, {
    userId,
  });
}

export function inviteBarberMutationOptions() {
  return useConvexMutation(api.invitations.invite);
}

export function invitationByCodeQueryOptions(code: string) {
  return convexQuery(api.invitations.getByCode, { code });
}

export function useInvitationByCode(code: string) {
  return useSuspenseQuery(invitationByCodeQueryOptions(code));
}

export function useBarbershopMembersByBarbershopId(
  barbershopId: Barbershop["_id"],
) {
  return useSuspenseQuery(
    barbershopMembersByBarbershopIdQueryOptions(barbershopId),
  );
}

export function useIsBarber(userId: string) {
  return useSuspenseQuery(isBarberQueryOptions(userId));
}

export function useServicesForBarber(
  barbershopMemberId: BarbershopMember["_id"],
) {
  return useQuery(servicesForBarberQueryOptions(barbershopMemberId));
}

export function useBarbersForService(serviceId: Service["_id"]) {
  return useQuery(barbersForServiceQueryOptions(serviceId));
}

export function useBarbershopMemberActions() {
  const inviteBarberMutation = useMutation({
    mutationFn: inviteBarberMutationOptions(),
  });

  const validateInvitationMutation = useMutation({
    mutationFn: useConvexMutation(api.invitations.validate),
  });

  const answerInvitationMutation = useMutation({
    mutationFn: useConvexMutation(api.invitations.answer),
  });

  const setBarberServicesMutation = useMutation({
    mutationFn: useConvexMutation(
      api.barbershopMemberServices.setBarberServices,
    ),
  });

  const removeBarberMutation = useMutation({
    mutationFn: useConvexMutation(
      api.barbershopMembers.removeBarberFromBarbershop,
    ),
  });

  return {
    inviteBarberMutation,
    validateInvitationMutation,
    answerInvitationMutation,
    setBarberServicesMutation,
    removeBarberMutation,
  };
}
