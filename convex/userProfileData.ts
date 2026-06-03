import { ConvexError } from "convex/values";
import { z } from "zod";

import { zInternalMutation, zMutation, zQuery } from ".";
import { api, components } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { errorMessages } from "./errors";
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

    const phoneNumber = profile.phoneNumber
      ? formatPhoneNumber(profile.phoneNumber)
      : profile.phoneNumber;

    return {
      ...profile,
      phoneNumber: phoneNumber || undefined,
    };
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
  args: z
    .object({
      phoneNumber: z.string().optional(),
      /** When true, removes the number from Better Auth and drops the profile field. */
      clearPhoneNumber: z.boolean().optional(),
    })
    .refine(
      (a) => a.clearPhoneNumber === true || typeof a.phoneNumber === "string",
      { message: "Indica un número de teléfono o elige quitar." },
    ),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "updatePhoneNumber", user._id);

    const profile = await getProfileByUserId(
      ctx,
      user.userId ?? String(user._id),
    );

    if (!profile) {
      return;
    }

    const isClear = args.clearPhoneNumber === true;
    const raw = isClear ? "" : (args.phoneNumber?.trim() ?? "");
    const normalized = raw ? formatPhoneNumber(raw) : "";

    if (!isClear && raw && !normalized) {
      throw new ConvexError(errorMessages.invalidPhoneNumber);
    }

    // `better-auth/minimal` does not register `phoneNumber` on `/update-user`, so
    // `parseUserInput` drops it. Persist on the component `user` row via the
    // Convex adapter (same pattern as `convex/auth.ts` triggers).
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        update: normalized
          ? {
              phoneNumber: normalized,
              phoneNumberVerified: false,
              updatedAt: Date.now(),
            }
          : {
              phoneNumber: null,
              phoneNumberVerified: false,
              updatedAt: Date.now(),
            },
        where: [{ field: "_id", operator: "eq", value: user._id }],
      },
    });

    if (normalized) {
      await ctx.db.patch(profile._id, { phoneNumber: normalized });
    } else {
      await ctx.db.replace(profile._id, {
        userId: profile.userId,
        email: profile.email,
        notificationsPreferences: profile.notificationsPreferences,
        ...(profile.name !== undefined ? { name: profile.name } : {}),
      });
    }
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
        await ctx.runMutation(api.r2.deleteR2Object, {
          key: args.previousKey,
        });
      } catch {
        // Non-fatal: old object may already be gone
      }
    }

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);

    await auth.api.updateUser({
      body: {
        image: args.imageUrl,
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
        await ctx.runMutation(api.r2.deleteR2Object, {
          key: args.previousKey,
        });
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

    await Promise.all(users.map((user) => ctx.db.delete(user._id)));
  },
});
