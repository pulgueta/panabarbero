import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import type { Notification, UserProfileData } from "./tables";
import { tables } from "./tables";

export function isNotificationEnabled(
  type: Notification["type"],
  notificationsPreferences: UserProfileData["notificationsPreferences"],
) {
  return notificationsPreferences.some((n) => n.type === type && n.enabled);
}

export const createNotification = internalMutation({
  args: {
    notification: v.object({
      receiverUserId: v.string(),
      title: v.string(),
      body: v.string(),
      reason: v.union(
        v.literal("appointment_reminder"),
        v.literal("appointment_cancelled"),
        v.literal("appointment_rescheduled"),
        v.literal("appointment_rescheduled_request"),
        v.literal("appointment_no_show"),
        v.literal("appointment_confirmed"),
        v.literal("appointment_rescheduled_accepted"),
        v.literal("appointment_rescheduled_denied"),
      ),
      senderUserId: v.union(v.literal("system"), v.string()),
      uuid: v.string(),
      preview: v.optional(v.string()),
      appointmentId: v.optional(v.id("appointments")),
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

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

    if (isNotificationEnabled("email", userProfile.notificationsPreferences)) {
      const notificationId = await ctx.db.insert("notifications", {
        ...args.notification,
        uuid: crypto.randomUUID(),
        senderUserId: user.userId ?? "",
        type: "email",
      });

      await ctx.scheduler.runAfter(0, internal.emails.sendEmail, {
        emailType: args.notification.reason,
        subject: args.notification.title,
        to: userProfile.email,
      });

      return notificationId;
    }

    if (isNotificationEnabled("sms", userProfile.notificationsPreferences)) {
      const notificationId = await ctx.db.insert("notifications", {
        ...args.notification,
        uuid: crypto.randomUUID(),
        senderUserId: user.userId ?? "",
        type: "sms",
      });

      await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
        body: args.notification.body,
        to: userProfile.phoneNumber ?? "",
      });

      return notificationId;
    }

    if (isNotificationEnabled("push", userProfile.notificationsPreferences)) {
      const notificationId = await ctx.db.insert("notifications", {
        ...args.notification,
        uuid: crypto.randomUUID(),
        senderUserId: user.userId ?? "",
        type: "push",
      });

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

      return notificationId;
    }

    throw new Error("No notification type enabled", {
      cause: args.notification.receiverUserId,
    });
  },
});

export const getNotificationsForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

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
    const user = await authComponent.getAuthUser(ctx);

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
    const user = await authComponent.getAuthUser(ctx);

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
