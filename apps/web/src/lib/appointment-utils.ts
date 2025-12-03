import type { Appointment } from "@panabarbero/convex/schemas";

import type { BadgeProps } from "@/components/ui/badge";

/**
 * Returns the appropriate badge variant for an appointment status
 */
export function getAppointmentStatusBadgeVariant(
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
    case "no-show":
      return "destructive";
    case "confirmed":
      return "success";
    default:
      return "secondary";
  }
}

/**
 * Returns the Spanish label for an appointment status
 */
export function getAppointmentStatusLabel(
  status: Appointment["status"],
): string {
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
