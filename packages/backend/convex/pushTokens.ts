import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { z } from "zod";

import { zAuthMutation, zInternalMutation } from ".";
import { components } from "./_generated/api";

/** Recipients are keyed by WorkOS user id (`user_…`). */
const pushNotifications = new PushNotifications<string>(
  components.pushNotifications,
);

/** Store the caller's Expo push token so the app can send them pushes. */
export const registerPushToken = zAuthMutation({
  ratelimit: "pushTokenRegister",
  args: z.object({ token: z.string().min(1) }),
  returns: z.null(),
  handler: async (ctx, args) => {
    await pushNotifications.recordToken(ctx, {
      userId: ctx.userId,
      pushToken: args.token,
    });

    return null;
  },
});

/**
 * Remove the caller's push token, so this device stops getting their pushes
 * after sign-out. The component keeps one token per user.
 */
export const unregisterPushToken = zAuthMutation({
  ratelimit: "pushTokenUnregister",
  args: z.object({}),
  returns: z.null(),
  handler: async (ctx) => {
    await pushNotifications.removeToken(ctx, { userId: ctx.userId });

    return null;
  },
});

/**
 * Queue one Expo push for a user. Users without a recorded token (web-only)
 * or with paused pushes are skipped by the component, not treated as errors.
 */
export const sendPush = zInternalMutation({
  args: z.object({
    userId: z.string(),
    title: z.string(),
    body: z.string(),
    data: z.record(z.string(), z.string()).optional(),
  }),
  returns: z.null(),
  handler: async (ctx, args) => {
    await pushNotifications.sendPushNotification(ctx, {
      userId: args.userId,
      notification: {
        title: args.title,
        body: args.body,
        data: args.data,
        priority: "high",
      },
      allowUnregisteredTokens: true,
    });

    return null;
  },
});
