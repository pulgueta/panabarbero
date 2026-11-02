import { api } from "@panabarbero/backend/convex/_generated/api";
import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";

import { useAccess } from "@/hooks/use-access";

/**
 * Whether the signed-in member may book for a customer: any team role plus
 * the owner's plan allowing staff-created appointments (pro and premium).
 * `canCreate` stays false while the plan loads; `planBlocks` turns true only
 * once a free plan is confirmed, so the screen can explain the block.
 */
export function useCanCreateAppointment() {
  const membership = useAccess()?.membership;
  const subscription = useQuery(
    api.auth.getBarbershopOwnerSubscription,
    membership ? { id: membership.barbershopId } : "skip",
  );
  const allowed = subscription?.planLimits.staffCanCreateAppointments;

  return {
    membership,
    isLoading: membership === undefined || subscription === undefined,
    canCreate: !!membership && allowed === true,
    planBlocks: !!membership && allowed === false,
  };
}

/** Catalog of the shop, or only the services `memberId` performs. */
export function useBookableServices(
  barbershopId: Id<"barbershops"> | undefined,
  memberId: Id<"barbershopMembers"> | undefined,
) {
  const all = useQuery(
    api.barbershops.getServices,
    barbershopId && !memberId ? { id: barbershopId } : "skip",
  );
  const forBarber = useQuery(
    api.barbershopMemberServices.getServicesForBarber,
    memberId ? { id: memberId } : "skip",
  );

  // A barber's list holds nulls for services deleted after the assignment.
  return memberId ? forBarber?.filter((service) => service !== null) : all;
}

/** Ids of the barbers who perform every service in `serviceIds`. */
export function useBarberIdsForServices(serviceIds: Id<"services">[]) {
  const barbers = useQuery(
    api.barbershopMemberServices.getBarbersForServices,
    serviceIds.length > 0 ? { serviceIds } : "skip",
  );
  return barbers?.map((barber) => barber._id);
}

export function useCreateAppointment() {
  return useMutation(api.appointments.create);
}
