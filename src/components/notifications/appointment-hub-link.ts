/** Search params for `/profile` when opening the customer Citas tab. */
export type CustomerAppointmentsSearch = { tab: "appointments" };

/** Search params for `/profile/barbershops/appointments` (barber calendar). */
export type BarberCalendarSearch = { date: number };

function startOfLocalDayMs(referenceMs: number = Date.now()): number {
  const d = new Date(referenceMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Where to send someone for “everything about appointments”:
 * - customers → profile Citas tab
 * - barbers (and staff/owners) → barbershop calendar for today
 */
export function getAppointmentHubLink(usesBarberCalendar: boolean): {
  to: "/profile" | "/profile/barbershops/appointments";
  search: CustomerAppointmentsSearch | BarberCalendarSearch;
} {
  if (usesBarberCalendar) {
    return {
      to: "/profile/barbershops/appointments",
      search: { date: startOfLocalDayMs() },
    };
  }
  return {
    to: "/profile",
    search: { tab: "appointments" },
  };
}
