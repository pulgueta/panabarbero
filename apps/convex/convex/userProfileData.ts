import { ConvexError, v } from "convex/values";

import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { errorMessages } from "./errors";
import { rateLimitOrThrow } from "./ratelimit";
import { tables } from "./tables";

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

export const getMyProfile = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) return null;

    if (user.userId !== args.userId) {
      return null;
    }

    const profile = await getProfileByUserId(ctx, args.userId ?? "");

    if (!profile) {
      return null;
    }

    return profile;
  },
});

export const updateName = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "updateName", user._id);

    const profile = await getProfileByUserId(ctx, user.userId ?? "");

    if (!profile) {
      return null;
    }

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    await auth.api.updateUser({
      body: {
        name: args.name.trim(),
      },
      headers,
    });

    await ctx.db.patch(profile._id, { name: args.name.trim() });
  },
});

export const updateEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "updateEmail", user._id);

    const profile = await getProfileByUserId(ctx, user.userId ?? "");

    if (!profile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    await auth.api.changeEmail({
      body: {
        newEmail: args.email.trim(),
      },
      headers,
    });

    await ctx.db.patch(profile._id, { email: args.email.trim() });
  },
});

export const updatePhoneNumber = mutation({
  args: { phoneNumber: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "updatePhoneNumber", user._id);

    const profile = await getProfileByUserId(ctx, user.userId ?? "");

    if (!profile)
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));

    await ctx.db.patch(profile._id, {
      phoneNumber: args.phoneNumber.trim(),
    });
  },
});

export const updateNotificationPreference = mutation({
  args: {
    type: v.union(v.literal("email"), v.literal("push"), v.literal("sms")),
    enabled: v.boolean(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

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

export const setProfilePhotoKey = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "updateNotificationPreference", user._id);

    const profile = await getProfileByUserId(ctx, user.userId ?? "");

    if (!profile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    // Delete the old profile photo from R2 if it exists
    // if (profile.profilePhotoKey && profile.profilePhotoKey !== args.key) {
    //   try {
    //     await r2.deleteObject(ctx, profile.profilePhotoKey);
    //   } catch (error) {
    //     console.error("Failed to delete old profile photo:", error);
    //   }
    // }

    // await ctx.db.patch(profile._id, { profilePhotoKey: args.key });
  },
});

export const removeProfilePhoto = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "setProfilePhotoKey", user._id);

    await rateLimitOrThrow(ctx, "removeProfilePhoto", user._id);

    const profile = await getProfileByUserId(ctx, user.userId ?? "");

    if (!profile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    // Delete the profile photo from R2 if it exists
    // if (profile.profilePhotoKey) {
    //   try {
    //     await r2.deleteObject(ctx, profile.profilePhotoKey);
    //   } catch (error) {
    //     console.error("Failed to delete profile photo:", error);
    //   }
    // }

    // await ctx.db.patch(profile._id, { profilePhotoKey: undefined });
  },
});

export const createProfile = internalMutation({
  args: {
    data: v.object({
      ...tables.userProfileData,
      userId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.insert("userProfileData", {
      ...args.data,
      userId: args.data.userId ?? "",
      uuid: crypto.randomUUID(),
    });

    return profile;
  },
});

export const updateProfile = internalMutation({
  args: {
    profileId: v.id("userProfileData"),
    data: tables.userProfileData.notificationsPreferences,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await ctx.db.patch(args.profileId, {
      notificationsPreferences: args.data,
    });
  },
});

export const deleteProfile = internalMutation({
  args: {
    profileId: v.id("userProfileData"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.profileId);
  },
});

export const deleteUserProfiles = internalMutation({
  args: {},
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
