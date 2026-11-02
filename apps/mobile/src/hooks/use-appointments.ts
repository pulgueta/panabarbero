import { api } from "@panabarbero/backend/convex/_generated/api";
import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo } from "react";

import { type Appointment, totalDuration } from "@/lib/appointments";
import { bogotaWeekdayKey } from "@/lib/dates";
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

/** Light rows for the days between `fromMs` and `toMs` (inclusive, ≤ 42 days). */
export function useRangeAppointments(
  barbershopId: Id<"barbershops"> | undefined,
  fromMs: number,
  toMs: number,
) {
  return useQuery(
    api.appointments.getByBarbershopIdRange,
    barbershopId ? { id: barbershopId, from: fromMs, to: toMs } : "skip",
  );
}

/** One row of the range query: enough for a dot, a week block, or a month chip. */
export type RangeAppointment = NonNullable<
  ReturnType<typeof useRangeAppointments>
>[number];

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

/**
 * Free slots of the appointment's barber on one Bogotá day, sized to the
 * appointment's own lines. Pass `undefined` to skip the query.
 */
export function useAvailableSlots(
  appointment: Appointment,
  dayMs: number | undefined,
) {
  const items = appointment.items ?? [];
  return useQuery(
    api.appointments.getAvailableSlots,
    dayMs === undefined
      ? "skip"
      : {
          barbershopId: appointment.barbershopId,
          barbershopMemberId: appointment.barbershopMemberId,
          serviceIds:
            items.length > 0
              ? items.map((item) => item.serviceId)
              : [appointment.serviceId],
          date: dayMs,
          // Snapshot width, so lines whose services were deleted still move.
          durationMinutes: totalDuration(appointment) ?? undefined,
          // The appointment's own slot is free to move into.
          excludeAppointmentId: appointment._id,
        },
  );
}

/** Staff-side status changes for one appointment. */
export function useAppointmentActions() {
  const { user } = useAuth();
  const setStatus = useMutation(api.appointments.setStatus);
  const cancelMutation = useMutation(api.appointments.cancel);
  const answerMutation = useMutation(api.appointments.answerRescheduleRequest);
  const deleteMutation = useMutation(api.appointments.deleteAppointment);
  const requestMutation = useMutation(api.appointments.requestReschedule);

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
      // The server derives the answerer's side.
      answerReschedule: (id: Id<"appointments">, accepted: boolean) =>
        answerMutation({ appointment: { id }, accepted }),
      remove: (id: Id<"appointments">) =>
        deleteMutation({ appointmentId: { id } }),
      requestReschedule: (id: Id<"appointments">, proposedDate: number) =>
        requestMutation({ appointmentId: { id }, proposedDate }),
    }),
    [
      setStatus,
      cancelMutation,
      answerMutation,
      deleteMutation,
      requestMutation,
      user?.id,
    ],
  );
}

type SlotsForArgs = {
  barbershopId: Id<"barbershops"> | undefined;
  memberId: Id<"barbershopMembers"> | undefined;
  serviceIds: Id<"services">[];
  dayMs: number | undefined;
};

/**
 * Free slots of `memberId` on one Bogotá day for the chosen services.
 * Skips the query until the barber, at least one service and the day are set.
 */
export function useSlotsFor({
  barbershopId,
  memberId,
  serviceIds,
  dayMs,
}: SlotsForArgs) {
  return useQuery(
    api.appointments.getAvailableSlots,
    barbershopId && memberId && serviceIds.length > 0 && dayMs !== undefined
      ? {
          barbershopId,
          barbershopMemberId: memberId,
          serviceIds,
          date: dayMs,
        }
      : "skip",
  );
}

/**
 * Days with no availability: the barber's effective schedule when `memberId`
 * is set, else the shop's weekly availability. Returns `isDayDisabled` for
 * the calendar; past days are the calendar's own rule.
 */
export function useClosedDays(
  barbershopId: Id<"barbershops"> | undefined,
  memberId?: Id<"barbershopMembers">,
) {
  const shopAvailability = useQuery(
    api.barbershops.getAvailability,
    barbershopId && !memberId ? { id: barbershopId } : "skip",
  );
  const barberSchedule = useQuery(
    api.barbershopMembers.getBarberSchedule,
    memberId ? { barbershopMemberId: memberId } : "skip",
  );
  const availability = memberId ? barberSchedule?.schedule : shopAvailability;

  return useMemo(() => {
    const activeDays = new Set(
      availability
        ?.filter((day) => day.weekDay.isActive)
        .map((day) => day.weekDay.day),
    );
    // While loading no day is closed; the slot query still guards the booking.
    return (dayMs: number) =>
      availability !== undefined && !activeDays.has(bogotaWeekdayKey(dayMs));
  }, [availability]);
}
