import { ConvexError } from "convex/values";
import { z } from "zod";

import { zInternalMutation, zMutation, zQuery } from ".";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { errorMessages } from "./errors";
import { r2 } from "./r2";
import { rateLimitOrThrow } from "./ratelimit";
import { userProfileData } from "./schema";
import { formatPhoneNumber } from "./utils";

export const getProfileByUserId = async (
  ctx: QueryCtx | MutationCtx,
  userId: string,
) => {
  return await ctx.db
    .query("userProfileData")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
};

export const getProfileByEmail = async (
  ctx: QueryCtx | MutationCtx,
  email: string,
) => {
  return await ctx.db
    .query("userProfileData")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
};

export const getMyProfile = zQuery({
  args: userProfileData.schema.pick({ userId: true }).partial(),
  handler: async (ctx, args) => {
    if (!args.userId) {
      return null;
    }

    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) return null;

    if (user.userId !== args.userId) {
      return null;
    }

    const profile = await getProfileByUserId(ctx, user.userId);

    if (!profile) {
      return null;
    }

    return profile;
  },
});

export const updateName = zMutation({
  args: userProfileData.schema.pick({ name: true }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "updateName", user._id);

    const profile = await getProfileByUserId(ctx, user.userId ?? "");

    if (!profile) {
      return null;
    }

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    const name = args.name?.trim();

    await auth.api.updateUser({
      body: {
        name,
      },
      headers,
    });

    await ctx.db.patch(profile._id, { name });
  },
});

export const updatePhoneNumber = zMutation({
  args: userProfileData.schema.pick({ phoneNumber: true }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "updatePhoneNumber", user._id);

    const profile = await getProfileByUserId(ctx, user.userId ?? "");

    if (!profile) {
      return;
    }

    const phoneNumber = args.phoneNumber
      ? formatPhoneNumber(args.phoneNumber)
      : undefined;

    await ctx.db.patch(profile._id, {
      phoneNumber,
    });
  },
});

export const updateNotificationPreference = zMutation({
  args: z.object({
    type: z.enum(["email", "sms"]),
    enabled: z.boolean(),
    userId: z.string(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    if (user.userId !== args.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const profile = await getProfileByUserId(ctx, args.userId);

    if (!profile)
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));

    const next = profile.notificationsPreferences.map((p) =>
      p.type === args.type ? { ...p, enabled: args.enabled } : p,
    );

    await ctx.db.patch(profile._id, { notificationsPreferences: next });
  },
});

export const setProfilePhotoKey = zMutation({
  args: z.object({
    imageUrl: z.string(),
    previousKey: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "setProfilePhotoKey", user._id);

    if (args.previousKey) {
      try {
        await r2.deleteObject(ctx, args.previousKey);
      } catch {
        throw new ConvexError(errorMessages.notFound("foto de perfil"));
      }
    }

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    await auth.api.updateUser({
      body: {
        image: args.imageUrl.endsWith("/")
          ? args.imageUrl.slice(0, -1)
          : args.imageUrl,
      },
      headers,
    });
  },
});

export const removeProfilePhoto = zMutation({
  args: z.object({
    previousKey: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "removeProfilePhoto", user._id);

    if (args.previousKey) {
      try {
        await r2.deleteObject(ctx, args.previousKey);
      } catch {
        // Non-fatal: old object may already be gone
      }
    }

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    await auth.api.updateUser({
      body: { image: "" },
      headers,
    });
  },
});

export const create = zInternalMutation({
  args: userProfileData.tools.insert,
  handler: async (ctx, args) => {
    const profile = await ctx.db.insert("userProfileData", args);

    return profile;
  },
});

export const update = zInternalMutation({
  args: userProfileData.tools.update,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await ctx.db.patch(args.id, {
      notificationsPreferences: args.data.notificationsPreferences,
    });
  },
});

export const deleteProfile = zInternalMutation({
  args: userProfileData.tools.id,
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const deleteUserProfiles = zInternalMutation({
  handler: async (ctx) => {
    const users = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId")
      .collect();

    for (const user of users) {
      await ctx.db.delete(user._id);
    }
  },
});
