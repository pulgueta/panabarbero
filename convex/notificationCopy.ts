import { subjects } from "./notificationSubjects";
import type { NotificationKind } from "./schema";

/**
 * Canonical copy for every end-user notification. A single function builds the
 * title + description used across in-app, email subjects, and SMS bodies so
 * the three channels cannot drift out of sync.
 */

export const siteUrl = () => process.env.SITE_URL ?? "";

export const deepLinks = {
  customerAppointments: () => `${siteUrl()}/profile?tab=appointments`,
  barberAppointments: () => `${siteUrl()}/profile/barbershops/appointments`,
  invitation: (code: string) => `${siteUrl()}/invitations/${code}`,
};

export type BaseInput = { barbershopName?: string };

export type NotificationInput =
  | {
      kind: "appointment_created";
      sendTo: "customer" | "barber";
      barbershopName?: string;
    }
  | {
      kind: "appointment_cancelled";
      sendTo: "customer" | "barber";
      customerName?: string;
      notes?: string;
    }
  | {
      kind: "appointment_reschedule_request";
      sendTo: "customer" | "barber";
    }
  | {
      kind: "appointment_reschedule_accepted";
      sendTo: "customer" | "barber";
    }
  | {
      kind: "appointment_reschedule_denied";
      sendTo: "customer" | "barber";
      barbershopName?: string;
    }
  | {
      kind: "appointment_reminder";
      barbershopName: string;
    }
  | {
      kind: "past_appointment_reminder";
    }
  | {
      kind: "team_invited";
      barbershopName: string;
      roleLabel: string;
    }
  | {
      kind: "barber_removed_cancellation";
      barbershopName: string;
      barberName: string;
    }
  | {
      kind: "service_deleted_cancellation";
      barbershopName: string;
      serviceName: string;
    };

export interface NotificationCopy {
  /** Persistent kind stored on the in-app row. */
  kind: NotificationKind;
  /** Short title (used as in-app title + email subject). */
  title: string;
  /** Longer body (used for in-app description, email body, and SMS prefix). */
  description: string;
  /** Role-specific deep link the user should land on when clicking the item. */
  href: string;
}

export function buildNotificationCopy(
  input: NotificationInput,
): NotificationCopy {
  switch (input.kind) {
    case "appointment_created": {
      const isCustomer = input.sendTo === "customer";
      return {
        kind: isCustomer ? "appointment_created" : "barber_appointment_created",
        title: isCustomer
          ? subjects.appointment_created
          : subjects.barber_appointment_created,
        description: isCustomer
          ? `Tu cita en ${input.barbershopName ?? "la barbería"} ha sido agendada.`
          : "Un cliente ha reservado una cita.",
        href: isCustomer
          ? deepLinks.customerAppointments()
          : deepLinks.barberAppointments(),
      };
    }
    case "appointment_cancelled": {
      const isCustomer = input.sendTo === "customer";
      const who = input.customerName ?? "El cliente";
      const base = isCustomer
        ? "Tu cita ha sido cancelada."
        : `${who} ha cancelado su cita.`;
      return {
        kind: "appointment_cancelled",
        title: subjects.appointment_cancelled,
        description: input.notes ? `${base} Motivo: ${input.notes}` : base,
        href: isCustomer
          ? deepLinks.customerAppointments()
          : deepLinks.barberAppointments(),
      };
    }
    case "appointment_reschedule_request": {
      const isCustomer = input.sendTo === "customer";
      return {
        kind: "appointment_reschedule_request",
        title: subjects.appointment_rescheduled_request,
        description: `${isCustomer ? "Tu barbero" : "Un cliente"} ha solicitado reagendar una cita.`,
        href: isCustomer
          ? deepLinks.customerAppointments()
          : deepLinks.barberAppointments(),
      };
    }
    case "appointment_reschedule_accepted": {
      const isCustomer = input.sendTo === "customer";
      return {
        kind: "appointment_reschedule_accepted",
        title: subjects.appointment_rescheduled_accepted,
        description: "Tu solicitud de reagendamiento ha sido aceptada.",
        href: isCustomer
          ? deepLinks.customerAppointments()
          : deepLinks.barberAppointments(),
      };
    }
    case "appointment_reschedule_denied": {
      const isCustomer = input.sendTo === "customer";
      return {
        kind: "appointment_reschedule_denied",
        title: isCustomer
          ? subjects.appointment_cancelled
          : subjects.appointment_rescheduled_denied,
        description: isCustomer
          ? `Tu cita en ${input.barbershopName ?? "la barbería"} ha sido cancelada.`
          : "Tu solicitud de reagendamiento ha sido rechazada.",
        href: isCustomer
          ? deepLinks.customerAppointments()
          : deepLinks.barberAppointments(),
      };
    }
    case "appointment_reminder": {
      return {
        kind: "appointment_reminder",
        title: subjects.appointment_reminder,
        description: `Tienes una cita en ~30 minutos en ${input.barbershopName}.`,
        href: deepLinks.customerAppointments(),
      };
    }
    case "past_appointment_reminder": {
      return {
        kind: "past_appointment_reminder",
        title: subjects.past_appointment_reminder,
        description:
          "Has tenido una cita hace poco, no olvides marcar su estado final.",
        href: deepLinks.barberAppointments(),
      };
    }
    case "team_invited": {
      return {
        kind: "team_invited",
        title: subjects.team_invited,
        description: `Has sido invitado a unirte a ${input.barbershopName} como ${input.roleLabel}.`,
        href: deepLinks.barberAppointments(),
      };
    }
    case "barber_removed_cancellation": {
      return {
        kind: "barber_removed_cancellation",
        title: subjects.appointment_cancelled,
        description: `Tu cita en ${input.barbershopName} ha sido cancelada porque el barbero ${input.barberName} ya no pertenece a la barbería.`,
        href: deepLinks.customerAppointments(),
      };
    }
    case "service_deleted_cancellation": {
      return {
        kind: "service_deleted_cancellation",
        title: subjects.appointment_cancelled,
        description: `Tu cita en ${input.barbershopName} ha sido cancelada porque el servicio "${input.serviceName}" ya no está disponible.`,
        href: deepLinks.customerAppointments(),
      };
    }
    default: {
      const _exhaustive: never = input;
      throw new Error(
        `Unhandled notification kind: ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}

/** SMS body = description + short deep link. */
export function buildSmsBody(copy: NotificationCopy): string {
  return `${copy.description} Ver detalles: ${copy.href}`;
}
