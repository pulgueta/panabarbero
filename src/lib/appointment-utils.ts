import type { Appointment } from "@convex/schema";

import type { BadgeProps } from "@/components/ui/badge";

/**
 * Returns the appropriate badge variant for an appointment status
 */
function getAppointmentStatusBadgeVariant(
  status: Appointment["status"],
): BadgeProps["variant"] {
  switch (status) {
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "rescheduled":
      return "info";
    case "denied":
    case "cancelled":
      return "destructive";
    case "no-show":
      return "outline";
    case "confirmed":
      return "success";
    default:
      return "secondary";
  }
}

/**
 * Returns the Spanish label for an appointment status
 */
function getAppointmentStatusLabel(status: Appointment["status"]): string {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "confirmed":
      return "Confirmada";
    case "cancelled":
      return "Cancelada";
    case "completed":
      return "Completada";
    case "no-show":
      return "No asistió";
    case "rescheduled":
      return "Reagendada";
    case "denied":
      return "Denegada";
    default:
      return status;
  }
}

export function getAppointmentDataByStatus(status: Appointment["status"]) {
  return {
    label: getAppointmentStatusLabel(status),
    variant: getAppointmentStatusBadgeVariant(status),
  };
}

/** Joined snapshot line names ("Corte + Barba"); null for legacy rows. */
export function appointmentItemsLabel(appointment: Appointment): string | null {
  if (!appointment.items || appointment.items.length === 0) {
    return null;
  }

  return appointment.items.map((item) => item.name).join(" + ");
}

/**
 * Σ(finalPrice ?? price) over the snapshot lines — the appointment's effective
 * total; null for legacy rows. `isStarting` marks a total that still has a
 * pending "desde" line, so it should read as "Desde $X".
 */
export function appointmentItemsTotal(
  appointment: Appointment,
): { total: number; isStarting: boolean } | null {
  if (!appointment.items || appointment.items.length === 0) {
    return null;
  }

  return {
    total: appointment.items.reduce(
      (total, item) => total + (item.finalPrice ?? item.price),
      0,
    ),
    isStarting: appointment.items.some(
      (item) => item.priceType === "starting" && item.finalPrice === undefined,
    ),
  };
}

/** Summed snapshot duration in minutes; null for legacy rows. */
export function appointmentItemsDuration(
  appointment: Appointment,
): number | null {
  if (!appointment.items || appointment.items.length === 0) {
    return null;
  }

  return appointment.items.reduce((total, item) => total + item.duration, 0);
}
