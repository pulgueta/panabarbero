import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tables } from "./tables";

export const createNotification = mutation({
  args: {
    notification: v.object({
      ...tables.notifications,
    }),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert(
      "notifications",
      args.notification,
    );

    return notificationId;
  },
});

export const getNotificationsForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .filter(({ eq, field }) => eq(field("receiverUserId"), args.userId))
      .withIndex("by_receiverUserId")
      .order("desc")
      .collect();

    return notifications;
  },
});

export const getNotificationsByReason = query({
  args: { reason: tables.notifications.reason },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .filter(({ eq, field }) => eq(field("reason"), args.reason))
      .withIndex("by_reason")
      .collect();

    return notifications;
  },
});

export const getNotificationsByAppointment = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .filter(({ eq, field }) => eq(field("appointmentId"), args.appointmentId))
      .withIndex("by_appointmentId")
      .collect();

    return notifications;
  },
});
