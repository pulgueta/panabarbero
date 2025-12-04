/** biome-ignore-all lint/style/noNonNullAssertion: needed */
import { errorMessages } from "@panabarbero/constants";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
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
  appointment_created: "Un usuario ha reservado una cita",
  barber_invited: "Invitación a unirte como barbero",
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
    const sender = (await ctx.runQuery(
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

    const notificationId = await ctx.db.insert("notifications", {
      ...args.notification,
      uuid: crypto.randomUUID(),
      senderUserId: sender.userId,
    });

    return notificationId;
  },
});

// Emails and SMS notifications

export const createAppointmentCancelledByBarbershopNotification =
  internalMutation({
    args: {
      customerUserId: v.string(),
      notes: v.string(),
      appointmentId: v.id("appointments"),
      to: v.string(),
      barbershopName: v.string(),
    },
    handler: async (ctx, args) => {
      const customerProfile = await ctx.runQuery(
        internal.userProfileData.getProfileByUserId,
        {
          userId: args.customerUserId,
        },
      );

      if (!customerProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de usuario"));
      }

      const channels = customerProfile.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type);

      const body = `Tu cita en ${args.barbershopName} ha sido cancelada. Tu barbero ha
              proporcionado el siguiente motivo: ${args.notes}`;

      await ctx.runMutation(internal.notifications.saveNotification, {
        notification: {
          reason: "appointment_cancelled",
          uuid: crypto.randomUUID(),
          channels,
          title: subjects.appointment_cancelled,
          body,
          senderUserId: "system",
          receiverUserId: args.customerUserId,
          appointmentId: args.appointmentId,
        },
      });

      if (
        isNotificationEnabled("email", customerProfile.notificationsPreferences)
      ) {
        await ctx.scheduler.runAfter(
          0,
          internal.emails.sendAppointmentCancelledByBarbershopEmail,
          {
            barbershopName: args.barbershopName,
            notes: args.notes,
            to: args.to,
          },
        );
      }

      if (
        isNotificationEnabled("sms", customerProfile.notificationsPreferences)
      ) {
        await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
          body,
          to: customerProfile.phoneNumber!,
        });
      }
    },
  });

export const createAppointmentCancelledByCustomerNotification =
  internalMutation({
    args: {
      barberUserId: v.string(),
      customerName: v.string(),
      appointmentId: v.id("appointments"),
      to: v.string(),
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

      const body = `${args.customerName} ha cancelado su cita.`;

      await ctx.runMutation(internal.notifications.saveNotification, {
        notification: {
          reason: "appointment_cancelled",
          uuid: crypto.randomUUID(),
          channels,
          title: subjects.appointment_cancelled,
          body,
          senderUserId: "system",
          receiverUserId: args.barberUserId,
          appointmentId: args.appointmentId,
        },
      });

      if (
        isNotificationEnabled("email", barberProfile.notificationsPreferences)
      ) {
        await ctx.scheduler.runAfter(
          0,
          internal.emails.sendAppointmentCancelledByCustomerEmail,
          {
            customerName: barberProfile.name!,
            to: args.to,
          },
        );
      }

      if (
        isNotificationEnabled("sms", barberProfile.notificationsPreferences)
      ) {
        await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
          body,
          to: barberProfile.phoneNumber!,
        });
      }
    },
  });

export const createAppointmentRescheduleRequestByBarbershopNotification =
  internalMutation({
    args: {
      barbershopName: v.string(),
      appointmentId: v.id("appointments"),
      to: v.string(),
      receiverUserId: v.string(),
      notes: v.string(),
    },
    handler: async (ctx, args) => {
      const requesterUserProfile = await ctx.runQuery(
        internal.userProfileData.getProfileByUserId,
        {
          userId: args.receiverUserId,
        },
      );

      if (!requesterUserProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de usuario"));
      }

      const channels = requesterUserProfile.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type);

      await ctx.runMutation(internal.notifications.saveNotification, {
        notification: {
          reason: "appointment_cancelled",
          uuid: crypto.randomUUID(),
          title: subjects.appointment_cancelled,
          channels,
          body: args.notes,
          senderUserId: "system",
          receiverUserId: args.receiverUserId,
        },
      });

      if (
        isNotificationEnabled(
          "email",
          requesterUserProfile.notificationsPreferences,
        )
      ) {
        await ctx.scheduler.runAfter(
          0,
          internal.emails.sendAppointmentRescheduleRequestByBarbershopEmail,
          {
            appointmentId: args.appointmentId,
            barbershopName: args.barbershopName,
            customerName: requesterUserProfile.name!,
            to: args.to,
          },
        );
      }

      if (
        isNotificationEnabled(
          "sms",
          requesterUserProfile.notificationsPreferences,
        )
      ) {
        await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
          body: args.notes,
          to: requesterUserProfile.phoneNumber!,
        });
      }
    },
  });

export const createAppointmentRescheduleRequestByCustomerNotification =
  internalMutation({
    args: {
      receiverUserId: v.string(),
      customerName: v.string(),
      appointmentId: v.id("appointments"),
      to: v.string(),
    },
    handler: async (ctx, args) => {
      const barberProfile = await ctx.runQuery(
        internal.userProfileData.getProfileByUserId,
        {
          userId: args.receiverUserId,
        },
      );

      if (!barberProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de barbero"));
      }

      const channels = barberProfile.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type);

      const body = `${args.customerName} ha solicitado reagendar su cita. Haz clic en el
                botón a continuación para ver la solicitud. Podrás aceptar o
                rechazar la propuesta.`;

      await ctx.runMutation(internal.notifications.saveNotification, {
        notification: {
          reason: "appointment_rescheduled_request",
          uuid: crypto.randomUUID(),
          channels,
          title: subjects.appointment_rescheduled_request,
          body,
          senderUserId: "system",
          receiverUserId: args.receiverUserId,
        },
      });

      if (
        isNotificationEnabled("email", barberProfile.notificationsPreferences)
      ) {
        await ctx.scheduler.runAfter(
          0,
          internal.emails.sendAppointmentRescheduleRequestByCustomerEmail,
          {
            appointmentId: args.appointmentId,
            customerName: barberProfile.name!,
            to: args.to,
          },
        );
      }

      if (
        isNotificationEnabled("sms", barberProfile.notificationsPreferences)
      ) {
        await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
          body,
          to: barberProfile.phoneNumber!,
        });
      }
    },
  });

export const createAppointmentRescheduleAcceptedNotification = internalMutation(
  {
    args: {
      appointmentId: v.id("appointments"),
      to: v.string(),
      receiverUserId: v.string(),
    },
    handler: async (ctx, args) => {
      const barberProfile = await ctx.runQuery(
        internal.userProfileData.getProfileByUserId,
        {
          userId: args.receiverUserId,
        },
      );

      if (!barberProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de barbero"));
      }

      const channels = barberProfile.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type);

      const body = "Tu solicitud de reagendamiento ha sido aceptada.";

      await ctx.runMutation(internal.notifications.saveNotification, {
        notification: {
          reason: "appointment_rescheduled_accepted",
          uuid: crypto.randomUUID(),
          channels,
          title: subjects.appointment_rescheduled_accepted,
          senderUserId: "system",
          receiverUserId: args.receiverUserId,
          appointmentId: args.appointmentId,
          body,
        },
      });

      if (
        isNotificationEnabled("email", barberProfile.notificationsPreferences)
      ) {
        await ctx.scheduler.runAfter(
          0,
          internal.emails.sendAppointmentRescheduledAcceptedEmail,
          {
            to: args.to,
          },
        );
      }

      if (
        isNotificationEnabled("sms", barberProfile.notificationsPreferences)
      ) {
        await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
          body,
          to: barberProfile.phoneNumber!,
        });
      }
    },
  },
);

export const createAppointmentRescheduleDeniedByBarbershopNotification =
  internalMutation({
    args: {
      appointmentId: v.id("appointments"),
      to: v.string(),
      receiverUserId: v.string(),
      notes: v.string(),
      barbershopName: v.string(),
    },
    handler: async (ctx, args) => {
      const barberProfile = await ctx.runQuery(
        internal.userProfileData.getProfileByUserId,
        {
          userId: args.receiverUserId,
        },
      );

      if (!barberProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de barbero"));
      }

      const channels = barberProfile.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type);

      const body = `Tu cita en ${args.barbershopName} ha sido cancelada. Tu barbero ha
              proporcionado el siguiente motivo: ${args.notes}`;

      await ctx.runMutation(internal.notifications.saveNotification, {
        notification: {
          reason: "appointment_rescheduled_denied",
          uuid: crypto.randomUUID(),
          channels,
          title: subjects.appointment_rescheduled_denied,
          body,
          senderUserId: "system",
          receiverUserId: args.receiverUserId,
          appointmentId: args.appointmentId,
        },
      });

      if (
        isNotificationEnabled("email", barberProfile.notificationsPreferences)
      ) {
        await ctx.scheduler.runAfter(
          0,
          internal.emails.sendAppointmentCancelledByBarbershopEmail,
          {
            barbershopName: barberProfile.name!,
            notes: args.notes,
            to: args.to,
          },
        );
      }

      if (
        isNotificationEnabled("sms", barberProfile.notificationsPreferences)
      ) {
        await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
          body,
          to: barberProfile.phoneNumber!,
        });
      }
    },
  });

export const createAppointmentRescheduleDeniedByCustomerNotification =
  internalMutation({
    args: {
      appointmentId: v.id("appointments"),
      to: v.string(),
      receiverUserId: v.string(),
    },
    handler: async (ctx, args) => {
      const customerProfile = await ctx.runQuery(
        internal.userProfileData.getProfileByUserId,
        {
          userId: args.receiverUserId,
        },
      );

      if (!customerProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de usuario"));
      }

      const channels = customerProfile.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type);

      const body = `${customerProfile.name!} ha rechazado tu solicitud de reagendamiento.`;

      await ctx.runMutation(internal.notifications.saveNotification, {
        notification: {
          reason: "appointment_rescheduled_denied",
          uuid: crypto.randomUUID(),
          channels,
          title: subjects.appointment_rescheduled_denied,
          body,
          senderUserId: "system",
          receiverUserId: args.receiverUserId,
          appointmentId: args.appointmentId,
        },
      });

      if (
        isNotificationEnabled("email", customerProfile.notificationsPreferences)
      ) {
        await ctx.scheduler.runAfter(
          0,
          internal.emails.sendAppointmentCancelledByCustomerEmail,
          {
            customerName: customerProfile.name!,
            to: args.to,
          },
        );
      }

      if (
        isNotificationEnabled("sms", customerProfile.notificationsPreferences)
      ) {
        await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
          body,
          to: customerProfile.phoneNumber!,
        });
      }
    },
  });
