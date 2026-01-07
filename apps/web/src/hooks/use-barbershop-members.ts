import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type {
  Barbershop,
  BarbershopMember,
  Service,
} from "@panabarbero/convex/schemas";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";

export function barbershopMembersByBarbershopIdQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.barbershopMembers.getBarbershopMembersByBarbershopId, {
    barbershopId,
  });
}

export function servicesForBarberQueryOptions(
  barbershopMemberId: BarbershopMember["_id"],
) {
  return convexQuery(api.barbershopMemberServices.getServicesForBarber, {
    barbershopMemberId,
  });
}

export function barbersForServiceQueryOptions(serviceId: Service["_id"]) {
  return convexQuery(api.barbershopMemberServices.getBarbersForService, {
    serviceId,
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

export function invitationByCodeQueryOptions(code: string) {
  return convexQuery(api.barbershopMembers.getInvitationByCode, { code });
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
    mutationFn: useConvexMutation(api.barbershopMembers.validateInvitation),
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershopMembers.acceptInvitation),
  });

  const denyInvitationMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershopMembers.denyInvitation),
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
    acceptInvitationMutation,
    denyInvitationMutation,
    setBarberServicesMutation,
    removeBarberMutation,
  };
}
