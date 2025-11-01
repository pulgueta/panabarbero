import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import type { Notification, UserProfileData } from "./tables";
import { tables } from "./tables";

export const emailSubjects = {
  appointment_reminder: "Recordatorio de cita",
  appointment_cancelled: "Cita cancelada",
  appointment_rescheduled: "Cita reagendada",
  appointment_rescheduled_request: "Solicitud de reagendamiento",
  appointment_no_show: "Cita no mostrada",
  appointment_confirmed: "Cita confirmada",
  appointment_rescheduled_accepted: "Reagendamiento aceptado",
  appointment_rescheduled_denied: "Reagendamiento rechazado",
  appointment_created: "Un usuario ha reservado una cita",
} satisfies Record<Notification["reason"], string>;

export function isNotificationEnabled(
  channel: Notification["channels"][number],
  notificationsPreferences: UserProfileData["notificationsPreferences"],
) {
  return notificationsPreferences.some((n) => n.type === channel && n.enabled);
}

export const createNotification = internalMutation({
  args: {
    notification: v.object({
      ...tables.notifications,
    }),
  },
  handler: async (ctx, args) => {
    const user = (await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: args.notification.receiverUserId,
      },
    )) as UserProfileData;

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const canSendNotification =
      args.notification.receiverUserId === user.userId;

    if (!canSendNotification) {
      throw new Error("You cannot send notifications to yourself", {
        cause: args.notification.receiverUserId,
      });
    }

    const userProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: args.notification.receiverUserId,
      },
    );

    if (!userProfile) {
      throw new Error("User profile not found", {
        cause: args.notification.receiverUserId,
      });
    }

    const notificationId = await ctx.db.insert("notifications", {
      ...args.notification,
      uuid: crypto.randomUUID(),
      senderUserId: user.userId ?? "",
    });

    if (isNotificationEnabled("email", userProfile.notificationsPreferences)) {
      await ctx.scheduler.runAfter(0, internal.emails.sendEmail, {
        emailType: args.notification.reason,
        subject: emailSubjects[args.notification.reason],
        to: userProfile.email,
      });
    }

    if (isNotificationEnabled("sms", userProfile.notificationsPreferences)) {
      await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
        body: args.notification.body,
        to: userProfile.phoneNumber ?? "",
      });
    }

    if (isNotificationEnabled("push", userProfile.notificationsPreferences)) {
      await ctx.scheduler.runAfter(
        0,
        internal.mobilePushTokens.sendPushNotification,
        {
          notification: {
            ...args.notification,
            uuid: crypto.randomUUID(),
          },
        },
      );
    }

    return notificationId;
  },
});

export const getNotificationsForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_receiverUserId")
      .filter(({ eq, field }) => eq(field("receiverUserId"), args.userId))
      .order("desc")
      .collect();

    return notifications;
  },
});

export const getNotificationsByReason = query({
  args: { reason: tables.notifications.reason },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_reason")
      .filter(({ eq, field }) => eq(field("reason"), args.reason))
      .collect();

    return notifications;
  },
});

export const getNotificationsByAppointment = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_appointmentId")
      .filter(({ eq, field }) => eq(field("appointmentId"), args.appointmentId))
      .collect();

    return notifications;
  },
});
