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
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    const canSaveNotification =
      args.notification.senderUserId === sender.userId;

    if (!canSaveNotification) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const notificationId = await ctx.db.insert("notifications", {
      ...args.notification,
      uuid: crypto.randomUUID(),
      senderUserId: sender.userId,
    });

    return notificationId;
  },
});

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
          internal.emails.sendAppointmentCancelled,
          {
            sendTo: "customer",
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
          internal.emails.sendAppointmentCancelled,
          {
            sendTo: "barber",
            notes: body,
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
