import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { authComponent } from "./auth";
import { tables } from "./tables";

export const getProfileByUserId = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", ({ eq }) => eq("userId", args.userId))
      .unique();
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
