import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { errorMessages } from "./errors";
import type { Notification, UserProfileData } from "./tables";
import { tables } from "./tables";

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
} satisfies Record<Notification["reason"], string>;

export function isNotificationEnabled(
  channel: Notification["channels"][number],
  notificationsPreferences: UserProfileData["notificationsPreferences"],
) {
  return notificationsPreferences.some((n) => n.type === channel && n.enabled);
}

export const saveNotification = internalMutation({
  args: {
    notification: v.object({
      ...tables.notifications,
    }),
  },
  handler: async (ctx, args) => {
    const isSystemSender = args.notification.senderUserId === "system";
    let sender: UserProfileData | null = null;

    if (!isSystemSender) {
      sender = (await ctx.runQuery(
        internal.userProfileData.getProfileByUserId,
        {
          userId: args.notification.senderUserId,
        },
      )) as UserProfileData;

      if (!sender) {
        throw new Error("Sender not found", {
          cause: sender,
        });
      }

      const canSaveNotification =
        args.notification.senderUserId === sender.userId;

      if (!canSaveNotification) {
        throw new Error("You cannot save notifications for yourself", {
          cause: args.notification.senderUserId,
        });
      }
    }

    const notificationId = await ctx.db.insert("notifications", {
      ...args.notification,
      uuid: crypto.randomUUID(),
      // biome-ignore lint/style/noNonNullAssertion: needed
      senderUserId: isSystemSender ? "system" : sender?.userId!,
    });

    return notificationId;
  },
});

// Emails and SMS notifications

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
    const receiverUserId = isCustomer
      ? (customerProfile?.userId ?? "user_does_not_exist")
      : barberProfile.userId;

    const toEmail = isCustomer
      ? (customerProfile?.email ?? appointment.contactEmail)
      : barberProfile.email;

    const channels =
      receiverProfile?.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type) ?? (isCustomer ? ["sms"] : []);

    const cancellingCustomerName =
      customerProfile?.name ?? appointment.customerName ?? "El cliente";

    const body = isCustomer
      ? `Tu cita ha sido cancelada.`
      : `${cancellingCustomerName} ha cancelado su cita.`;

    const smsBody = args.notes ? `${body} Motivo: ${args.notes}` : body;

    await ctx.runMutation(internal.notifications.saveNotification, {
      notification: {
        reason: "appointment_cancelled",
        uuid: crypto.randomUUID(),
        channels,
        title: subjects.appointment_cancelled,
        body,
        senderUserId: "system",
        receiverUserId,
        appointmentId: args.appointmentId,
      },
    });

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
    const receiverUserId = isCustomer
      ? appointment.userId
      : barberProfile.userId;

    const toEmail = isCustomer
      ? (appointment.contactEmail ?? customerProfile?.email)
      : barberProfile.email;

    const channels = receiverProfile?.notificationsPreferences
      .filter((n) => n.enabled)
      .map((n) => n.type);

    const body = `${isCustomer ? "Tu barbero" : "Un cliente"} ha solicitado reagendar una cita.`;

    if (channels) {
      await ctx.runMutation(internal.notifications.saveNotification, {
        notification: {
          reason: "appointment_rescheduled_request",
          uuid: crypto.randomUUID(),
          title: subjects.appointment_rescheduled_request,
          channels,
          body,
          senderUserId: "system",
          receiverUserId,
        },
      });
    }

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
        body,
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

      const channels = receiverProfile.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type);

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

      const reason = args.accepted
        ? "appointment_rescheduled_accepted"
        : "appointment_rescheduled_denied";
      const title = args.accepted
        ? subjects.appointment_rescheduled_accepted
        : subjects.appointment_rescheduled_denied;

      await ctx.runMutation(internal.notifications.saveNotification, {
        notification: {
          reason,
          uuid: crypto.randomUUID(),
          channels,
          title,
          body,
          senderUserId: "system",
          receiverUserId: args.receiverUserId,
          appointmentId: args.appointmentId,
        },
      });

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
          body,
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

    const customerChannels =
      customerProfile?.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type) ?? (args.receiverPhoneNumber ? ["sms"] : []);
    const channels = {
      customer: customerChannels,
      barber: barberProfile.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type),
    };

    const body = {
      barber: "Un cliente ha reservado una cita.",
      customer: `Tu cita en ${args.barbershopName} ha sido agendada.`,
    };

    const isCustomer = args.sendTo === "customer";
    const receiverProfile = isCustomer ? customerProfile : barberProfile;
    const receiverChannels = isCustomer ? channels.customer : channels.barber;
    const receiverBody = isCustomer ? body.customer : body.barber;
    const receiverUserId = isCustomer ? args.customerUserId : args.barberUserId;
    const subject = isCustomer
      ? subjects.appointment_created
      : subjects.barber_appointment_created;

    await ctx.runMutation(internal.notifications.saveNotification, {
      notification: {
        reason: isCustomer
          ? "appointment_created"
          : "barber_appointment_created",
        uuid: crypto.randomUUID(),
        channels: receiverChannels,
        title: subject,
        body: receiverBody,
        senderUserId: "system",
        receiverUserId,
        appointmentId: args.appointmentId,
      },
    });

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
        body: receiverBody,
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

    const channels =
      customerProfile?.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type) ?? (args.receiverPhoneNumber ? ["sms"] : []);

    const body = `Tienes una cita en ~30 minutos en ${args.barbershopName}.`;

    if (customerProfile) {
      await ctx.runMutation(internal.notifications.saveNotification, {
        notification: {
          reason: "appointment_reminder",
          uuid: crypto.randomUUID(),
          channels,
          title: subjects.appointment_reminder,
          body,
          receiverUserId: args.customerUserId,
          senderUserId: "system",
        },
      });
    }

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
        body,
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

    const channels = barberProfile.notificationsPreferences
      .filter((n) => n.enabled)
      .map((n) => n.type);

    const body = `Haz tenido una cita hace poco, no olvides marcar su estado final.`;

    await ctx.runMutation(internal.notifications.saveNotification, {
      notification: {
        reason: "past_appointment_reminder",
        uuid: crypto.randomUUID(),
        channels,
        title: subjects.past_appointment_reminder,
        body,
        receiverUserId: barberProfile.userId,
        senderUserId: "system",
      },
    });

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
        body,
        to: barberProfile.phoneNumber,
      });
    }
  },
});
