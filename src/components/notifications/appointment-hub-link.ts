import { getCalendarDayTimestamp } from "@/calendar/use-calendar-appointments";

/** Search params for `/profile` when opening the customer Citas tab. */
export type CustomerAppointmentsSearch = { tab: "appointments" };

/** Search params for `/profile/barbershops/appointments` (barber calendar). */
export type BarberCalendarSearch = { date: number };

/**
 * Where to send someone for “everything about appointments”:
 * - customers → profile Citas tab
 * - barbers (and staff/owners) → barbershop calendar for today
 */
export interface AppointmentHubLink {
  to: "/profile" | "/profile/barbershops/appointments";
  search: CustomerAppointmentsSearch | BarberCalendarSearch;
}

export function getAppointmentHubLink(
  usesBarberCalendar: boolean,
): AppointmentHubLink {
  if (usesBarberCalendar) {
    // The calendar route reads `date` as a Bogotá day; a local midnight from
    // another zone would land on the wrong day.
    return {
      to: "/profile/barbershops/appointments",
      search: { date: getCalendarDayTimestamp(new Date()) },
    };
  }
  return {
    to: "/profile",
    search: { tab: "appointments" },
  };
}
