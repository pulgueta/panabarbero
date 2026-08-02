/**
 * Canonical subjects used as notification titles across email, SMS, and
 * in-app surfaces. Kept in a standalone module to avoid circular imports with
 * `notifications.ts`.
 */
export const subjects = {
  appointment_reminder: "Recordatorio de cita",
  appointment_cancelled: "Cita cancelada",
  appointment_rescheduled: "Cita reagendada",
  appointment_rescheduled_request: "Solicitud de reagendamiento",
  appointment_no_show: "Cita no mostrada",
  appointment_confirmed: "Cita confirmada",
  appointment_rescheduled_accepted: "Reagendamiento aceptado",
  appointment_rescheduled_denied: "Reagendamiento rechazado",
  appointment_created: "Cita agendada",
  barber_appointment_created: "Nueva cita en tu barbería",
  team_invited: "Invitación a unirte a la barbería",
  past_appointment_reminder: "Recordatorio de cita pasada",
  service_line_removed: "Tu cita se actualizó",
  review_invite: "Califica tu visita",
  review_needs_attention: "Tu reseña necesita atención",
  low_stock: "Inventario bajo",
} satisfies Record<string, string>;
