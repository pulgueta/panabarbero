import { api } from "@panabarbero/backend/convex/_generated/api";
import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";

import { useAuth } from "@/providers/auth-provider";

/** Appointments for one Bogotá day. Barbers get only their own (server-side). */
export function useDayAppointments(
  barbershopId: Id<"barbershops"> | undefined,
  dayMs: number,
) {
  return useQuery(
    api.appointments.getByBarbershopId,
    barbershopId ? { id: barbershopId, date: dayMs } : "skip",
  );
}

/** `undefined` while loading, `null` when the appointment does not exist. */
export function useAppointment(id: Id<"appointments">) {
  return useQuery(api.appointments.getById, { id });
}

/** Active barbers of the shop, and a lookup from member id to display name. */
export function useShopMembers(barbershopId: Id<"barbershops"> | undefined) {
  const members = useQuery(
    api.barbershopMembers.getByBarbershopId,
    barbershopId ? { id: barbershopId } : "skip",
  );

  const namesById = useMemo(
    () => new Map(members?.map((member) => [member._id, member.name])),
    [members],
  );

  const memberName = useCallback(
    (memberId: Id<"barbershopMembers">) => namesById.get(memberId) || "Barbero",
    [namesById],
  );

  return { members, memberName };
}

/**
 * Pending appointments the customer asked to move. The query is not
 * role-scoped, so pass `memberId` to keep only one barber's requests.
 */
export function useRescheduleRequests(
  barbershopId: Id<"barbershops"> | undefined,
  memberId?: Id<"barbershopMembers">,
) {
  const requests = useQuery(
    api.appointments.getRescheduledRequests,
    barbershopId ? { id: barbershopId } : "skip",
  );

  return useMemo(
    () =>
      requests?.filter(
        (appointment) =>
          appointment.proposedDate !== undefined &&
          (memberId === undefined ||
            appointment.barbershopMemberId === memberId),
      ),
    [requests, memberId],
  );
}

/** Staff-side status changes for one appointment. */
export function useAppointmentActions() {
  const { user } = useAuth();
  const setStatus = useMutation(api.appointments.setStatus);
  const cancelMutation = useMutation(api.appointments.cancel);
  const answerMutation = useMutation(api.appointments.answerRescheduleRequest);

  return useMemo(
    () => ({
      complete: (
        id: Id<"appointments">,
        finalPrices?: { serviceId: Id<"services">; finalPrice: number }[],
      ) => setStatus({ appointment: { id }, status: "completed", finalPrices }),
      markNoShow: (id: Id<"appointments">) =>
        setStatus({ appointment: { id }, status: "no-show" }),
      cancel: (id: Id<"appointments">, reason: string) =>
        cancelMutation({
          appointmentId: { id },
          cancelledByUserId: user?.id ?? "",
          reason,
          cancelledBy: "barber",
        }),
      answerReschedule: (id: Id<"appointments">, accepted: boolean) =>
        answerMutation({
          appointment: { id },
          accepted,
          answeredBy: "barber",
        }),
    }),
    [setStatus, cancelMutation, answerMutation, user?.id],
  );
}
