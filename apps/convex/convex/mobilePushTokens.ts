import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation } from "./_generated/server";
import { authComponent } from "./auth";
import { rateLimitOrThrow } from "./ratelimit";

const pushNotifications = new PushNotifications(components.pushNotifications);

export const createMobilePushToken = mutation({
  args: {
    token: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    await rateLimitOrThrow(ctx, "createMobilePushToken", user._id);

    if (user.userId !== args.userId) {
      throw new Error(
        "You are not authorized to create this mobile push token",
        {
          cause: `Invalid user ID: ${args.userId}`,
        },
      );
    }

    const tokenId = await pushNotifications.recordToken(ctx, {
      // @ts-expect-error - TODO: fix this
      userId: user.userId as Id<"users">,
      pushToken: args.token,
    });

    return tokenId;
  },
});

export const sendPushNotification = internalMutation({
  args: {
    notification: v.object({
      title: v.string(),
      body: v.string(),
      preview: v.optional(v.string()),
      reason: v.string(),
      uuid: v.string(),
      receiverUserId: v.string(),
      senderUserId: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const pushId = await pushNotifications.sendPushNotification(ctx, {
      // @ts-expect-error - TODO: fix this
      userId: args.notification.receiverUserId as Id<"users">,
      notification: {
        ...args.notification,
        categoryId: args.notification.reason,
        priority: "high",
        data: {
          notificationId: args.notification.uuid,
          notification_reason: args.notification.reason,
        },
        subtitle: args.notification.preview,
      },
    });

    return pushId;
  },
});
