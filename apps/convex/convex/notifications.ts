import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { tables } from "./tables";

export const createNotification = mutation({
  args: {
    notification: v.object({
      ...tables.notifications,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    if (args.notification.senderUserId !== user.userId) {
      throw new Error("You are not authorized to create this notification", {
        cause: `Invalid sender user ID: ${args.notification.senderUserId}`,
      });
    }

    const notificationId = await ctx.db.insert("notifications", {
      ...args.notification,
      uuid: crypto.randomUUID(),
      senderUserId: user.userId ?? "",
      receiverUserId: args.notification.receiverUserId,
    });

    return notificationId;
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
