import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { errorMessages } from "./errors";
import type { UserProfileData } from "./tables";

export const subjects = {
  appointment_reminder: "Recordatorio de cita",
  appointment_cancelled: "Cita cancelada",
  appointment_rescheduled: "Cita reagendada",
  appointment_rescheduled_request: "Solicitud de reagendamiento",
  appointment_no_show: "Cita no mostrada",
  appointment_confirmed: "Cita confirmada",
  appointment_rescheduled_accepted: "Reagendamiento aceptado",
  appointment_rescheduled_denied: "Reagendamiento rechazado",
  appointment_created: "Nueva cita",
  barber_appointment_created: "",
  barber_invited: "Invitación a unirte como barbero",
  past_appointment_reminder: "Recordatorio de cita pasada",
} satisfies Record<string, string>;

export function isNotificationEnabled(
  channel: UserProfileData["notificationsPreferences"][number]["type"],
  notificationsPreferences: UserProfileData["notificationsPreferences"],
) {
  return notificationsPreferences.some((n) => n.type === channel && n.enabled);
}

export const createAppointmentCancelledNotification = internalMutation({
  args: {
    customerUserId: v.string(),
    notes: v.string(),
    appointmentId: v.id("appointments"),
    sendTo: v.union(v.literal("customer"), v.literal("barber")),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    const barbershopMember = await ctx.db.get(appointment.barbershopMemberId);

    if (!barbershopMember) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    const customerProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: appointment.userId,
      },
    );

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
      isNotificationEnabled("email", receiverProfile.notificationsPreferences)
    ) {
      if (toEmail) {
        await ctx.scheduler.runAfter(
          0,
          internal.emails.sendAppointmentCancelled,
          {
            notes: args.notes,
            sendTo: args.sendTo,
            to: toEmail,
            body,
          },
        );
      }
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
      await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
        body: smsBody,
        to: phoneNumber,
      });
    }
  },
});

export const createAppointmentRescheduleRequestNotification = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    sendTo: v.union(v.literal("customer"), v.literal("barber")),
  },
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
      customerProfile = await ctx.runQuery(
        internal.userProfileData.getProfileByUserId,
        {
          userId: appointment.userId,
        },
      );

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
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendAppointmentRescheduleRequestEmail,
        {
          appointmentId: args.appointmentId,
          to: toEmail,
          body,
          sendTo: args.sendTo,
        },
      );
    }

    const smsEnabled = receiverProfile
      ? isNotificationEnabled("sms", receiverProfile.notificationsPreferences)
      : isCustomer;
    const phoneNumber = isCustomer
      ? appointment.contactPhone
      : receiverProfile?.phoneNumber;

    if (smsEnabled && phoneNumber) {
      await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
        body: smsBody,
        to: phoneNumber,
      });
    }
  },
});

export const createAppointmentRescheduleDecisionNotification = internalMutation(
  {
    args: {
      appointmentId: v.id("appointments"),
      to: v.string(),
      receiverUserId: v.string(),
      accepted: v.boolean(),
      notes: v.optional(v.string()),
      barbershopName: v.optional(v.string()),
      role: v.union(v.literal("barber"), v.literal("customer")),
    },
    handler: async (ctx, args) => {
      const receiverProfile = await ctx.runQuery(
        internal.userProfileData.getProfileByUserId,
        {
          userId: args.receiverUserId,
        },
      );

      if (!receiverProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de usuario"));
      }

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
          await ctx.scheduler.runAfter(
            0,
            internal.emails.sendAppointmentRescheduledAcceptedEmail,
            { to: args.to, body },
          );
        } else {
          if (isCustomer) {
            await ctx.scheduler.runAfter(
              0,
              internal.emails.sendAppointmentCancelled,
              {
                sendTo: "customer",
                notes: args.notes ?? "Sin motivo especificado.",
                to: args.to,
                body,
              },
            );
          } else {
            await ctx.scheduler.runAfter(
              0,
              internal.emails.sendAppointmentRescheduledDeniedEmail,
              { to: args.to, body },
            );
          }
        }
      }

      if (
        isNotificationEnabled(
          "sms",
          receiverProfile.notificationsPreferences,
        ) &&
        receiverProfile.phoneNumber
      ) {
        await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
          body: smsBody,
          to: receiverProfile.phoneNumber,
        });
      }
    },
  },
);

export const createAppointmentCreatedNotification = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    to: v.optional(v.string()),
    customerUserId: v.string(),
    barberUserId: v.string(),
    sendTo: v.union(v.literal("customer"), v.literal("barber")),
    barbershopName: v.optional(v.string()),
    receiverPhoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    let customerProfile: UserProfileData | null = null;

    if (args.customerUserId !== "user_does_not_exist") {
      customerProfile = await ctx.runQuery(
        internal.userProfileData.getProfileByUserId,
        {
          userId: args.customerUserId,
        },
      );

      if (!customerProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de usuario"));
      }
    }

    const barberProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: args.barberUserId,
      },
    );

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

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

    if (
      isNotificationEnabled(
        "email",
        receiverProfile?.notificationsPreferences ?? [],
      ) &&
      receiverProfile?.email &&
      args.to
    ) {
      await ctx.scheduler.runAfter(
        0,
        isCustomer
          ? internal.emails.sendAppointmentCreatedToUserEmail
          : internal.emails.sendAppointmentCreatedToBarberEmail,
        {
          to: args.to,
          body: receiverBody,
          subject,
        },
      );
    }

    const fallbackPhone =
      receiverProfile?.phoneNumber ?? args.receiverPhoneNumber;
    const smsEnabled = receiverProfile
      ? isNotificationEnabled(
          "sms",
          receiverProfile.notificationsPreferences ?? [],
        )
      : isCustomer;

    if (smsEnabled && fallbackPhone) {
      await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
        body: smsBody,
        to: fallbackPhone,
      });
    }
  },
});

export const createAppointmentReminderNotification = internalMutation({
  args: {
    to: v.optional(v.string()),
    customerUserId: v.string(),
    barbershopName: v.string(),
    receiverPhoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let customerProfile: UserProfileData | null = null;

    if (args.customerUserId !== "user_does_not_exist") {
      customerProfile = await ctx.runQuery(
        internal.userProfileData.getProfileByUserId,
        {
          userId: args.customerUserId,
        },
      );

      if (!customerProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de usuario"));
      }
    }

    const body = `Tienes una cita en ~30 minutos en ${args.barbershopName}.`;

    // Deep link to view appointments
    const appointmentLink = `${process.env.SITE_URL}/profile?tab=appointments`;
    const smsBody = `${body} Ver detalles: ${appointmentLink}`;

    if (
      customerProfile &&
      isNotificationEnabled(
        "email",
        customerProfile.notificationsPreferences,
      ) &&
      args.to
    ) {
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendAppointmentReminderEmail,
        {
          to: args.to,
          body,
        },
      );
    }

    const phoneNumber =
      customerProfile?.phoneNumber ?? args.receiverPhoneNumber;
    const smsEnabled = customerProfile
      ? isNotificationEnabled("sms", customerProfile.notificationsPreferences)
      : !!phoneNumber;

    if (smsEnabled && phoneNumber) {
      await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
        body: smsBody,
        to: phoneNumber,
      });
    }
  },
});

export const createPastAppointmentReminderNotification = internalMutation({
  args: {
    barberUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const barberProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: args.barberUserId,
      },
    );

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
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendPastAppointmentReminderEmail,
        {
          to: barberProfile.email,
        },
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

export const createBarberInvitedNotification = internalMutation({
  args: {
    invitationId: v.id("invitations"),
    barbershopId: v.id("barbershops"),
    email: v.string(),
    code: v.string(),
    inviterUserId: v.string(),
    roles: v.array(
      v.union(v.literal("owner"), v.literal("barber"), v.literal("staff")),
    ),
    expiresAt: v.number(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const barbershop = await ctx.db.get(args.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    const inviterProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      { userId: args.inviterUserId },
    );

    const invitationUrl = `${process.env.SITE_URL}/invitations/${args.code}`;

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
 * Notification when an appointment is cancelled due to service deletion.
 * Sends to customer via both email and SMS if contact info is available.
 */
export const createServiceDeletedCancellationNotification = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    customerUserId: v.string(),
    serviceName: v.string(),
    barbershopName: v.string(),
    contactPhone: v.string(),
    contactEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const customerProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: args.customerUserId,
      },
    );

    const body = `Tu cita en ${args.barbershopName} ha sido cancelada porque el servicio "${args.serviceName}" ya no está disponible.`;

    const appointmentsUrl = `${process.env.SITE_URL}/profile?tab=appointments`;
    const smsBody = `${body} Ver detalles: ${appointmentsUrl}`;

    const toEmail = customerProfile?.email ?? args.contactEmail;

    // Send email if available and enabled
    if (toEmail) {
      const emailEnabled = customerProfile
        ? isNotificationEnabled(
            "email",
            customerProfile.notificationsPreferences,
          )
        : true; // Default to enabled for guests

      if (emailEnabled) {
        await ctx.scheduler.runAfter(
          0,
          internal.emails.sendAppointmentCancelled,
          {
            notes: `Servicio "${args.serviceName}" eliminado`,
            sendTo: "customer",
            to: toEmail,
            body,
          },
        );
      }
    }

    // Send SMS if phone number is available
    const phoneNumber = customerProfile?.phoneNumber ?? args.contactPhone;
    if (phoneNumber) {
      const smsEnabled = customerProfile
        ? isNotificationEnabled("sms", customerProfile.notificationsPreferences)
        : true; // Default to enabled for guests

      if (smsEnabled) {
        await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
          body: smsBody,
          to: phoneNumber,
        });
      }
    }
  },
});
