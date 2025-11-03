import { errorMessages } from "@panabarbero/constants";
import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { authComponent } from "./auth";
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

    return profile;
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

    await ctx.db.patch(profile._id, { name: args.name.trim() || undefined });
  },
});

export const updateEmail = mutation({
  args: { email: v.string() },
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

    await ctx.db.patch(profile._id, { email: args.email.trim() });
  },
});

export const updatePhoneNumber = mutation({
  args: { phoneNumber: v.string() },
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

    const value = args.phoneNumber.trim();
    await ctx.db.patch(profile._id, { phoneNumber: value || undefined });
  },
});

export const updateNotificationPreference = mutation({
  args: {
    type: v.union(v.literal("email"), v.literal("push"), v.literal("sms")),
    enabled: v.boolean(),
  },
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

    const next = profile.notificationsPreferences.map((p) =>
      p.type === args.type ? { ...p, enabled: args.enabled } : p,
    );

    await ctx.db.patch(profile._id, { notificationsPreferences: next });
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
      throw new Error("User not authenticated", {
        cause: user,
      });
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
