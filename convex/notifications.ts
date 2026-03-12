import { ConvexError } from "convex/values";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zInternalMutation } from ".";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  incrementEmailSent,
  incrementSmsSent,
  isEmailLimitNotExceeded,
  isSmsLimitNotExceeded,
} from "./acl";
import { errorMessages } from "./errors";
import type { UserProfileData } from "./schema";
import { getProfileByUserId } from "./userProfileData";

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
  barber_invited: "Invitación a unirte como barbero",
  past_appointment_reminder: "Recordatorio de cita pasada",
} satisfies Record<string, string>;

export function isNotificationEnabled(
  channel: UserProfileData["notificationsPreferences"][number]["type"],
  notificationsPreferences: UserProfileData["notificationsPreferences"],
) {
  return notificationsPreferences.some((n) => n.type === channel && n.enabled);
}

/**
 * Schedule an SMS via Twilio while enforcing the barbershop's monthly SMS quota.
 *
 * If `barbershopId` is provided the limit is checked and the counter is
 * incremented. When the quota has been reached the SMS is silently skipped —
 * this function never throws on limit violations.
 * When `barbershopId` is `undefined` (e.g. for notifications that are not
 * scoped to a barbershop) the SMS is sent without quota checks.
 */
async function scheduleSmsWithQuota(
  ctx: MutationCtx,
  opts: {
    to: string;
    body: string;
    barbershopId?: Id<"barbershops">;
  },
): Promise<void> {
  if (opts.barbershopId) {
    const canSend = await isSmsLimitNotExceeded(ctx, opts.barbershopId);

    if (!canSend) {
      return;
    }

    await incrementSmsSent(ctx, opts.barbershopId);
  }

  await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
    body: opts.body,
    to: opts.to,
  });
}

/**
 * Schedule an email while enforcing the barbershop's monthly email quota.
 *
 * If `barbershopId` is provided the limit is checked and the counter is
 * incremented. When the quota has been reached the email is silently skipped —
 * this function never throws on limit violations.
 * When `barbershopId` is `undefined` (e.g. for notifications that are not
 * scoped to a barbershop) the email is sent without quota checks.
 *
 * @param send - A thunk that performs the actual `ctx.scheduler.runAfter` call.
 *               Only invoked when the quota allows it.
 */
async function scheduleEmailWithQuota(
  ctx: MutationCtx,
  barbershopId: Id<"barbershops"> | undefined,
  send: () => Promise<unknown>,
): Promise<void> {
  if (barbershopId) {
    const canSend = await isEmailLimitNotExceeded(ctx, barbershopId);

    if (!canSend) {
      return;
    }

    await incrementEmailSent(ctx, barbershopId);
  }

  await send();
}

export const createAppointmentCancelled = zInternalMutation({
  args: z.object({
    customerUserId: z.string(),
    notes: z.string(),
    appointmentId: zid("appointments"),
    sendTo: z.enum(["customer", "barber"]),
  }),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    const barbershopMember = await ctx.db.get(appointment.barbershopMemberId);

    if (!barbershopMember) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    const customerProfile = await getProfileByUserId(ctx, appointment.userId);

    const barberProfile = await ctx.db.get(barbershopMember.userProfileDataId);

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const isCustomer = args.sendTo === "customer";
    const receiverProfile = isCustomer ? customerProfile : barberProfile;

    const toEmail = isCustomer
      ? (customerProfile?.email ?? appointment.contactEmail)
      : barberProfile.email;

    const cancellingCustomerName =
      customerProfile?.name ?? appointment.customerName ?? "El cliente";

    const body = isCustomer
      ? `Tu cita ha sido cancelada.`
      : `${cancellingCustomerName} ha cancelado su cita.`;

    // Deep link to view appointments
    const appointmentLink = isCustomer
      ? `${process.env.SITE_URL}/profile?tab=appointments`
      : `${process.env.SITE_URL}/profile/barbershops/appointments`;

    let smsBody = args.notes ? `${body} Motivo: ${args.notes}` : body;
    smsBody = `${smsBody} Ver detalles: ${appointmentLink}`;

    if (
      receiverProfile &&
      isNotificationEnabled(
        "email",
        receiverProfile.notificationsPreferences,
      ) &&
      toEmail
    ) {
      await scheduleEmailWithQuota(ctx, appointment.barbershopId, () =>
        ctx.scheduler.runAfter(0, internal.emails.sendAppointmentCancelled, {
          notes: args.notes,
          sendTo: args.sendTo,
          to: toEmail,
          body,
        }),
      );
    }

    const smsEnabled = receiverProfile
      ? isNotificationEnabled("sms", receiverProfile.notificationsPreferences)
      : isCustomer;

    if (
      smsEnabled &&
      (receiverProfile?.phoneNumber || appointment.contactPhone)
    ) {
      const phoneNumber =
        receiverProfile?.phoneNumber ?? appointment.contactPhone;
      await scheduleSmsWithQuota(ctx, {
        body: smsBody,
        to: phoneNumber,
        barbershopId: appointment.barbershopId,
      });
    }
  },
});

export const createAppointmentRescheduleRequest = zInternalMutation({
  args: z.object({
    appointmentId: zid("appointments"),
    sendTo: z.enum(["customer", "barber"]),
  }),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    const barbershopMember = await ctx.db.get(appointment.barbershopMemberId);

    if (!barbershopMember) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    let customerProfile: UserProfileData | null = null;

    if (appointment.userId !== "user_does_not_exist") {
      customerProfile = await getProfileByUserId(ctx, appointment.userId);

      if (!customerProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de usuario"));
      }
    }

    const barberProfile = await ctx.db.get(barbershopMember.userProfileDataId);

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const isCustomer = args.sendTo === "customer";
    const receiverProfile = isCustomer ? customerProfile : barberProfile;
    const toEmail = isCustomer
      ? (appointment.contactEmail ?? customerProfile?.email)
      : barberProfile.email;

    const body = `${isCustomer ? "Tu barbero" : "Un cliente"} ha solicitado reagendar una cita.`;

    // Deep link to view/respond to reschedule request
    const appointmentLink = isCustomer
      ? `${process.env.SITE_URL}/profile?tab=appointments`
      : `${process.env.SITE_URL}/profile/barbershops/appointments`;

    const smsBody = `${body} Responde aquí: ${appointmentLink}`;

    if (
      receiverProfile &&
      isNotificationEnabled(
        "email",
        receiverProfile.notificationsPreferences,
      ) &&
      toEmail
    ) {
      await scheduleEmailWithQuota(ctx, appointment.barbershopId, () =>
        ctx.scheduler.runAfter(
          0,
          internal.emails.sendAppointmentRescheduleRequestEmail,
          { to: toEmail, body, sendTo: args.sendTo },
        ),
      );
    }

    const smsEnabled = receiverProfile
      ? isNotificationEnabled("sms", receiverProfile.notificationsPreferences)
      : isCustomer;
    const phoneNumber = isCustomer
      ? appointment.contactPhone
      : receiverProfile?.phoneNumber;

    if (smsEnabled && phoneNumber) {
      await scheduleSmsWithQuota(ctx, {
        body: smsBody,
        to: phoneNumber,
        barbershopId: appointment.barbershopId,
      });
    }
  },
});

export const createAppointmentRescheduleDecision = zInternalMutation({
  args: z.object({
    appointmentId: zid("appointments"),
    to: z.string(),
    receiverUserId: z.string(),
    accepted: z.boolean(),
    notes: z.string().optional(),
    barbershopName: z.string().optional(),
    role: z.enum(["barber", "customer"]),
  }),
  handler: async (ctx, args) => {
    const receiverProfile = await getProfileByUserId(ctx, args.receiverUserId);

    if (!receiverProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    const appointment = await ctx.db.get(args.appointmentId);

    const acceptedBody = "Tu solicitud de reagendamiento ha sido aceptada.";
    const deniedBodyForCustomer = `Tu cita en ${args.barbershopName} ha sido cancelada.`;
    const deniedBodyForBarber =
      "Tu solicitud de reagendamiento ha sido rechazada.";

    const isCustomer = args.role === "customer";
    const body = args.accepted
      ? acceptedBody
      : isCustomer
        ? deniedBodyForCustomer
        : deniedBodyForBarber;

    // Deep link to view appointments
    const appointmentLink = isCustomer
      ? `${process.env.SITE_URL}/profile?tab=appointments`
      : `${process.env.SITE_URL}/profile/barbershops/appointments`;

    const smsBody = `${body} Ver detalles: ${appointmentLink}`;

    if (
      isNotificationEnabled("email", receiverProfile.notificationsPreferences)
    ) {
      if (args.accepted) {
        await scheduleEmailWithQuota(ctx, appointment?.barbershopId, () =>
          ctx.scheduler.runAfter(
            0,
            internal.emails.sendAppointmentRescheduledAcceptedEmail,
            { to: args.to, body },
          ),
        );
      } else {
        if (isCustomer) {
          await scheduleEmailWithQuota(ctx, appointment?.barbershopId, () =>
            ctx.scheduler.runAfter(
              0,
              internal.emails.sendAppointmentCancelled,
              {
                sendTo: "customer",
                notes: args.notes ?? "Sin motivo especificado.",
                to: args.to,
                body,
              },
            ),
          );
        } else {
          await scheduleEmailWithQuota(ctx, appointment?.barbershopId, () =>
            ctx.scheduler.runAfter(
              0,
              internal.emails.sendAppointmentRescheduledDeniedEmail,
              { to: args.to, body },
            ),
          );
        }
      }
    }

    if (
      isNotificationEnabled("sms", receiverProfile.notificationsPreferences) ||
      receiverProfile.phoneNumber?.length
    ) {
      if (receiverProfile.phoneNumber) {
        await scheduleSmsWithQuota(ctx, {
          body: smsBody,
          to: receiverProfile.phoneNumber,
          barbershopId: appointment?.barbershopId,
        });
      }
    }
  },
});

export const createAppointmentCreated = zInternalMutation({
  args: z.object({
    appointmentId: zid("appointments"),
    to: z.string().optional(),
    customerUserId: z.string(),
    barberUserId: z.string(),
    sendTo: z.enum(["customer", "barber"]),
    barbershopName: z.string().optional(),
    receiverPhoneNumber: z.string(),
    isBarberCreated: z.boolean(),
  }),
  handler: async (ctx, args) => {
    let customerProfile: UserProfileData | null = null;

    if (args.customerUserId !== "user_does_not_exist") {
      customerProfile = await getProfileByUserId(ctx, args.customerUserId);

      if (!customerProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de usuario"));
      }
    }

    const barberProfile = await getProfileByUserId(ctx, args.barberUserId);

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const appointment = await ctx.db.get(args.appointmentId);

    const body = {
      barber: "Un cliente ha reservado una cita.",
      customer: `Tu cita en ${args.barbershopName} ha sido agendada.`,
    };

    const isCustomer = args.sendTo === "customer";
    const receiverProfile = isCustomer ? customerProfile : barberProfile;
    const receiverBody = isCustomer ? body.customer : body.barber;
    const subject = isCustomer
      ? subjects.appointment_created
      : subjects.barber_appointment_created;

    // Deep link to view appointments
    const appointmentLink = isCustomer
      ? `${process.env.SITE_URL}/profile?tab=appointments`
      : `${process.env.SITE_URL}/profile/barbershops/appointments`;

    const smsBody = `${receiverBody} Ver detalles: ${appointmentLink}`;

    const to = args.to ?? receiverProfile?.email;

    if (
      isNotificationEnabled(
        "email",
        receiverProfile?.notificationsPreferences ?? [],
      ) &&
      to
    ) {
      await scheduleEmailWithQuota(ctx, appointment?.barbershopId, () =>
        ctx.scheduler.runAfter(
          0,
          isCustomer
            ? internal.emails.sendAppointmentCreatedToUserEmail
            : internal.emails.sendAppointmentCreatedToBarberEmail,
          { to, body: receiverBody, subject },
        ),
      );
    }

    const fallbackPhone =
      receiverProfile?.phoneNumber ?? args.receiverPhoneNumber;

    let smsEnabled = false;

    if (isCustomer) {
      smsEnabled =
        args.isBarberCreated ||
        (receiverProfile
          ? isNotificationEnabled(
              "sms",
              receiverProfile.notificationsPreferences ?? [],
            )
          : true);
    } else {
      smsEnabled = receiverProfile
        ? isNotificationEnabled(
            "sms",
            receiverProfile.notificationsPreferences ?? [],
          )
        : false;
    }

    if (smsEnabled && fallbackPhone) {
      await scheduleSmsWithQuota(ctx, {
        body: smsBody,
        to: fallbackPhone,
        barbershopId: appointment?.barbershopId,
      });
    }
  },
});

export const createAppointmentReminder = zInternalMutation({
  args: z.object({
    to: z.string().optional(),
    customerUserId: z.string(),
    barbershopName: z.string(),
    barbershopId: zid("barbershops").optional(),
    receiverPhoneNumber: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    let customerProfile: UserProfileData | null = null;

    if (args.customerUserId !== "user_does_not_exist") {
      customerProfile = await getProfileByUserId(ctx, args.customerUserId);

      if (!customerProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de usuario"));
      }
    }

    const body = `Tienes una cita en ~30 minutos en ${args.barbershopName}.`;

    // Deep link to view appointments
    const appointmentLink = `${process.env.SITE_URL}/profile?tab=appointments`;
    const smsBody = `${body} Ver detalles: ${appointmentLink}`;

    const to = args.to ?? customerProfile?.email;

    if (
      customerProfile &&
      isNotificationEnabled(
        "email",
        customerProfile.notificationsPreferences,
      ) &&
      to
    ) {
      await scheduleEmailWithQuota(ctx, args.barbershopId, () =>
        ctx.scheduler.runAfter(
          0,
          internal.emails.sendAppointmentReminderEmail,
          {
            to,
            body,
          },
        ),
      );
    }

    const phoneNumber =
      customerProfile?.phoneNumber || args.receiverPhoneNumber;
    const smsEnabled = customerProfile
      ? isNotificationEnabled("sms", customerProfile.notificationsPreferences)
      : !!phoneNumber;

    if (smsEnabled && phoneNumber) {
      await scheduleSmsWithQuota(ctx, {
        body: smsBody,
        to: phoneNumber,
        barbershopId: args.barbershopId,
      });
    }
  },
});

export const createPastAppointmentReminder = zInternalMutation({
  args: z.object({
    barberUserId: z.string(),
  }),
  handler: async (ctx, args) => {
    const barberProfile = await getProfileByUserId(ctx, args.barberUserId);

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const body = `Haz tenido una cita hace poco, no olvides marcar su estado final.`;

    // Deep link to appointments management
    const appointmentLink = `${process.env.SITE_URL}/profile/barbershops/appointments`;
    const smsBody = `${body} Ver citas: ${appointmentLink}`;

    if (
      isNotificationEnabled("email", barberProfile.notificationsPreferences)
    ) {
      await scheduleEmailWithQuota(ctx, undefined, () =>
        ctx.scheduler.runAfter(
          0,
          internal.emails.sendPastAppointmentReminderEmail,
          { to: barberProfile.email },
        ),
      );
    }

    if (
      isNotificationEnabled("sms", barberProfile.notificationsPreferences) &&
      barberProfile.phoneNumber
    ) {
      await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
        body: smsBody,
        to: barberProfile.phoneNumber,
      });
    }
  },
});

export const createBarberInvited = zInternalMutation({
  args: z.object({
    invitationId: zid("invitations"),
    barbershopId: zid("barbershops"),
    email: z.string(),
    code: z.string(),
    inviterUserId: z.string(),
    roles: z.array(z.enum(["owner", "barber", "staff"])),
    expiresAt: z.number(),
    phone: z.string(),
  }),
  handler: async (ctx, args) => {
    const barbershop = await ctx.db.get(args.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    const inviterProfile = await getProfileByUserId(ctx, args.inviterUserId);

    const invitationUrl = `${process.env.SITE_URL}/invitations/${args.code}`;

    await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
      body: `Has sido invitado a unirte a ${barbershop.name} como barbero. Ver detalles: ${invitationUrl}`,
      to: args.phone,
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendBarberInvitationEmail, {
      to: args.email,
      barbershopName: barbershop.name,
      invitationLink: invitationUrl,
      inviterName: inviterProfile?.name ?? undefined,
      expiresLabel: new Date(args.expiresAt).toLocaleDateString("es-ES"),
    });
  },
});

/**
 * Notification when an appointment is cancelled because a barber was removed
 * from the barbershop. Sends to the customer via email and SMS.
 */
export const createBarberRemovedCancellation = zInternalMutation({
  args: z.object({
    appointmentId: zid("appointments"),
    customerUserId: z.string(),
    barberName: z.string(),
    barbershopName: z.string(),
    contactPhone: z.string(),
    contactEmail: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const customerProfile = await getProfileByUserId(ctx, args.customerUserId);

    const appointment = await ctx.db.get(args.appointmentId);

    const body = `Tu cita en ${args.barbershopName} ha sido cancelada porque el barbero ${args.barberName} ya no pertenece a la barbería.`;

    const appointmentsUrl = `${process.env.SITE_URL}/profile?tab=appointments`;
    const smsBody = `${body} Ver detalles: ${appointmentsUrl}`;

    const toEmail = customerProfile?.email ?? args.contactEmail;

    const emailEnabled = customerProfile
      ? isNotificationEnabled("email", customerProfile.notificationsPreferences)
      : true; // Default to enabled for guests

    if (emailEnabled && toEmail) {
      await scheduleEmailWithQuota(ctx, appointment?.barbershopId, () =>
        ctx.scheduler.runAfter(0, internal.emails.sendAppointmentCancelled, {
          notes: `Barbero ${args.barberName} eliminado de la barbería`,
          sendTo: "customer",
          to: toEmail,
          body,
        }),
      );
    }

    const phoneNumber = customerProfile?.phoneNumber ?? args.contactPhone;

    const smsEnabled = customerProfile
      ? isNotificationEnabled("sms", customerProfile.notificationsPreferences)
      : true; // Default to enabled for guests

    if (smsEnabled) {
      await scheduleSmsWithQuota(ctx, {
        body: smsBody,
        to: phoneNumber,
        barbershopId: appointment?.barbershopId,
      });
    }
  },
});

/**
 * Notification when an appointment is cancelled due to service deletion.
 * Sends to customer via both email and SMS if contact info is available.
 */
export const createServiceDeletedCancellation = zInternalMutation({
  args: z.object({
    appointmentId: zid("appointments"),
    customerUserId: z.string(),
    serviceName: z.string(),
    barbershopName: z.string(),
    contactPhone: z.string(),
    contactEmail: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const customerProfile = await getProfileByUserId(ctx, args.customerUserId);

    const appointment = await ctx.db.get(args.appointmentId);

    const body = `Tu cita en ${args.barbershopName} ha sido cancelada porque el servicio "${args.serviceName}" ya no está disponible.`;

    const appointmentsUrl = `${process.env.SITE_URL}/profile?tab=appointments`;
    const smsBody = `${body} Ver detalles: ${appointmentsUrl}`;

    const toEmail = customerProfile?.email ?? args.contactEmail;

    const emailEnabled = customerProfile
      ? isNotificationEnabled("email", customerProfile.notificationsPreferences)
      : true; // Default to enabled for guests

    if (emailEnabled && toEmail) {
      await scheduleEmailWithQuota(ctx, appointment?.barbershopId, () =>
        ctx.scheduler.runAfter(0, internal.emails.sendAppointmentCancelled, {
          notes: `Servicio "${args.serviceName}" eliminado`,
          sendTo: "customer",
          to: toEmail,
          body,
        }),
      );
    }

    const phoneNumber = customerProfile?.phoneNumber ?? args.contactPhone;

    const smsEnabled = customerProfile
      ? isNotificationEnabled("sms", customerProfile.notificationsPreferences)
      : true; // Default to enabled for guests

    if (smsEnabled) {
      await scheduleSmsWithQuota(ctx, {
        body: smsBody,
        to: phoneNumber,
        barbershopId: appointment?.barbershopId,
      });
    }
  },
});
