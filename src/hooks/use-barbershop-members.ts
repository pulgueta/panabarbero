import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Barbershop, BarbershopMember, Service } from "@convex/schema";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";

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

export function isStaffQueryOptions(userId: string) {
  return convexQuery(api.barbershopMembers.isStaff, { userId });
}

export function isOwnerQueryOptions(userId: string) {
  return convexQuery(api.barbershopMembers.isOwner, { userId });
}

export function staffByBarbershopIdQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.barbershopMembers.getStaffByBarbershopId, {
    id: barbershopId,
  });
}

export function barberByUserIdQueryOptions(userId: string) {
  return convexQuery(api.barbershopMembers.getByUserId, {
    userId,
  });
}

export function useBarberByUserId(userId: string) {
  return useSuspenseQuery(barberByUserIdQueryOptions(userId));
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

export function useIsStaff(userId: string) {
  return useSuspenseQuery(isStaffQueryOptions(userId));
}

export function useIsOwner(userId: string) {
  return useSuspenseQuery(isOwnerQueryOptions(userId));
}

export function useStaffByBarbershopId(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(staffByBarbershopIdQueryOptions(barbershopId));
}

export function useServicesForBarber(
  barbershopMemberId: BarbershopMember["_id"],
) {
  return useQuery(servicesForBarberQueryOptions(barbershopMemberId));
}

export function useBarbersForService(serviceId: Service["_id"]) {
  return useQuery(barbersForServiceQueryOptions(serviceId));
}

// ---------------------------------------------------------------------------
// Barber schedule
// ---------------------------------------------------------------------------

export function barberScheduleQueryOptions(
  barbershopMemberId: BarbershopMember["_id"],
) {
  return convexQuery(api.barbershopMembers.getBarberSchedule, {
    barbershopMemberId,
  });
}

export function useBarberSchedule(barbershopMemberId: BarbershopMember["_id"]) {
  return useQuery(barberScheduleQueryOptions(barbershopMemberId));
}

export function useBarbershopMemberActions() {
  const inviteBarberMutation = useMutation({
    mutationFn: useConvexMutation(api.invitations.invite),
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

  const removeStaffMutation = useMutation({
    mutationFn: useConvexMutation(
      api.barbershopMembers.removeStaffFromBarbershop,
    ),
  });

  const toggleBarberRoleMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershopMembers.toggleBarberRole),
  });

  const updateBarberScheduleMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershopMembers.updateBarberSchedule),
  });

  const resetBarberScheduleMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershopMembers.resetBarberSchedule),
  });

  return {
    inviteBarberMutation,
    validateInvitationMutation,
    answerInvitationMutation,
    setBarberServicesMutation,
    removeBarberMutation,
    removeStaffMutation,
    toggleBarberRoleMutation,
    updateBarberScheduleMutation,
    resetBarberScheduleMutation,
  };
}
