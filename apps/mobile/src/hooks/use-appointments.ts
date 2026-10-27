import { api } from "@panabarbero/backend/convex/_generated/api";
import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useCallback, useMemo } from "react";

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
