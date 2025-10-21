import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { tables } from "./tables";

const pushNotifications = new PushNotifications(components.pushNotifications);

export const createMobilePushToken = mutation({
  args: {
    values: v.object({
      ...tables.mobilePushTokens,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    if (user.userId !== args.values.userId) {
      throw new Error(
        "You are not authorized to create this mobile push token",
        {
          cause: `Invalid user ID: ${args.values.userId}`,
        },
      );
    }

    await pushNotifications.recordToken(ctx, {
      // @ts-expect-error - TODO: fix this
      userId: user.userId as Id<"users">,
      pushToken: args.values.token,
    });

    const tokenId = await ctx.db.insert("mobile_push_tokens", {
      ...args.values,
      userId: args.values.userId,
      uuid: crypto.randomUUID(),
    });

    return tokenId;
  },
});

export const getMobilePushTokensForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const tokens = await ctx.db
      .query("mobile_push_tokens")
      .withIndex("by_userId")
      .filter(({ eq, field }) => eq(field("userId"), args.userId))
      .collect();

    return tokens;
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
