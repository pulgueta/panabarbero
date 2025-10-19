import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { tables } from "./tables";

export const createMobilePushToken = mutation({
  args: {
    token: v.object({
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

    if (user.userId !== args.token.userId) {
      throw new Error(
        "You are not authorized to create this mobile push token",
        {
          cause: `Invalid user ID: ${args.token.userId}`,
        },
      );
    }

    const tokenId = await ctx.db.insert("mobile_push_tokens", {
      ...args.token,
      userId: user.userId,
      uuid: crypto.randomUUID(),
    });

    return tokenId;
  },
});

export const upsertMobilePushToken = mutation({
  args: {
    token: v.object({
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

    const existing = await ctx.db
      .query("mobile_push_tokens")
      .withIndex("by_userId")
      .filter(({ eq, field, and }) =>
        and(
          eq(field("userId"), args.token.userId),
          eq(field("token"), args.token.token),
        ),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args.token);

      return existing._id;
    }

    if (user.userId !== args.token.userId) {
      throw new Error(
        "You are not authorized to upsert this mobile push token",
        {
          cause: `Invalid user ID: ${args.token.userId}`,
        },
      );
    }

    const tokenId = await ctx.db.insert("mobile_push_tokens", {
      ...args.token,
      userId: user.userId,
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
