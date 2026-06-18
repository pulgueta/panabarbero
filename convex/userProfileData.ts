import { ConvexError } from "convex/values";
import { z } from "zod";

import { zAuthMutation, zInternalMutation, zQuery } from ".";
import { api } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { errorMessages } from "./errors";
import { getUserId, requireUserId } from "./identity";
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

    const userId = await getUserId(ctx);

    if (!userId || userId !== args.userId) {
      return null;
    }

    const profile = await getProfileByUserId(ctx, userId);

    if (!profile) {
      return null;
    }

    const phoneNumber = profile.phoneNumber
      ? formatPhoneNumber(profile.phoneNumber)
      : profile.phoneNumber;

    return {
      ...profile,
      phoneNumber: phoneNumber || undefined,
    };
  },
});

export const updateName = zAuthMutation({
  args: userProfileData.schema.pick({ name: true }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "updateName", userId);

    const profile = await getProfileByUserId(ctx, userId);

    if (!profile) {
      return null;
    }

    const name = args.name?.trim();

    await ctx.db.patch(profile._id, { name });
  },
});

export const updatePhoneNumber = zAuthMutation({
  args: z
    .object({
      phoneNumber: z.string().optional(),
      /** When true, drops the phone number from the profile. */
      clearPhoneNumber: z.boolean().optional(),
    })
    .refine(
      (a) => a.clearPhoneNumber === true || typeof a.phoneNumber === "string",
      { message: "Indica un número de teléfono o elige quitar." },
    ),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "updatePhoneNumber", userId);

    const profile = await getProfileByUserId(ctx, userId);

    if (!profile) {
      return;
    }

    const isClear = args.clearPhoneNumber === true;
    const raw = isClear ? "" : (args.phoneNumber?.trim() ?? "");
    const normalized = raw ? formatPhoneNumber(raw) : "";

    if (!isClear && raw && !normalized) {
      throw new ConvexError(errorMessages.invalidPhoneNumber);
    }

    await ctx.db.patch(profile._id, {
      phoneNumber: normalized || undefined,
    });
  },
});

export const updateNotificationPreference = zAuthMutation({
  args: z.object({
    type: z.enum(["email", "sms"]),
    enabled: z.boolean(),
    userId: z.string(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    if (userId !== args.userId) {
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

export const setProfilePhotoKey = zAuthMutation({
  args: z.object({
    imageUrl: z.string(),
    previousKey: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "setProfilePhotoKey", userId);

    const profile = await getProfileByUserId(ctx, userId);

    if (!profile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    if (args.previousKey) {
      try {
        await ctx.runMutation(api.r2.deleteR2Object, {
          key: args.previousKey,
        });
      } catch {
        // Non-fatal: old object may already be gone
      }
    }

    await ctx.db.patch(profile._id, { image: args.imageUrl });
  },
});

export const removeProfilePhoto = zAuthMutation({
  args: z.object({
    previousKey: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "removeProfilePhoto", userId);

    const profile = await getProfileByUserId(ctx, userId);

    if (!profile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    if (args.previousKey) {
      try {
        await ctx.runMutation(api.r2.deleteR2Object, {
          key: args.previousKey,
        });
      } catch {
        // Non-fatal: old object may already be gone
      }
    }

    await ctx.db.patch(profile._id, { image: undefined });
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
    await requireUserId(ctx);

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

    await Promise.all(users.map((user) => ctx.db.delete(user._id)));
  },
});
