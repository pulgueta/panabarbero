import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { errorMessages } from "./errors";
import { r2 } from "./index";
import { tables } from "./tables";

export const getProfileByUserId = internalQuery({
  args: { userId: tables.userProfileData.userId },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const getProfileByEmail = internalQuery({
  args: { email: tables.userProfileData.email },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfileData")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

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

    const profile = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId ?? ""))
      .unique();

    if (!profile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    // Resolve profile photo URL from R2 if a key is stored
    let profilePhotoUrl: string | null = null;
    if (profile.profilePhotoKey) {
      try {
        profilePhotoUrl = await r2.getUrl(profile.profilePhotoKey);
      } catch (error) {
        console.error("Failed to get profile photo URL:", error);
      }
    }

    return {
      ...profile,
      profilePhotoUrl,
    };
  },
});

export const updateName = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const profile = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId ?? ""))
      .unique();

    if (!profile) throw new Error("Profile not found");

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

    const profile = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId ?? ""))
      .unique();

    if (!profile)
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));

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

    const profile = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId ?? ""))
      .unique();

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

    const profile = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

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
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const profile = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId ?? ""))
      .unique();

    if (!profile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    // Delete the old profile photo from R2 if it exists
    if (profile.profilePhotoKey && profile.profilePhotoKey !== args.key) {
      try {
        await r2.deleteObject(ctx, profile.profilePhotoKey);
      } catch (error) {
        console.error("Failed to delete old profile photo:", error);
      }
    }

    await ctx.db.patch(profile._id, { profilePhotoKey: args.key });
    return null;
  },
});

export const removeProfilePhoto = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const profile = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId ?? ""))
      .unique();

    if (!profile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    // Delete the profile photo from R2 if it exists
    if (profile.profilePhotoKey) {
      try {
        await r2.deleteObject(ctx, profile.profilePhotoKey);
      } catch (error) {
        console.error("Failed to delete profile photo:", error);
      }
    }

    await ctx.db.patch(profile._id, { profilePhotoKey: undefined });
    return null;
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
