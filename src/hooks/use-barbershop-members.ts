import { api } from "@convex/_generated/api";
import type { Barbershop, BarbershopMember, Service } from "@convex/schema";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
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
  barbershopMemberId: BarbershopMember["_id"] | undefined,
) {
  return useQuery(
    convexQuery(
      api.barbershopMemberServices.getServicesForBarber,
      barbershopMemberId ? { id: barbershopMemberId } : "skip",
    ),
  );
}

export function useBarbersForService(serviceId: Service["_id"] | undefined) {
  return useQuery(
    convexQuery(
      api.barbershopMemberServices.getBarbersForService,
      serviceId ? { id: serviceId } : "skip",
    ),
  );
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
    setBarberServicesMutation,
    removeBarberMutation,
    removeStaffMutation,
    toggleBarberRoleMutation,
    updateBarberScheduleMutation,
    resetBarberScheduleMutation,
  };
}
