import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tables } from "./tables";

export const upsertMobilePushToken = mutation({
  args: {
    token: v.object({
      ...tables.mobilePushTokens,
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const existing = await ctx.db
      .query("mobile_push_tokens")
      .filter(({ eq, field, and }) =>
        and(
          eq(field("userId"), args.token.userId),
          eq(field("token"), args.token.token),
        ),
      )
      .withIndex("by_userId")
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args.token);
      return existing._id;
    }
    const id = await ctx.db.insert("mobile_push_tokens", args.token);

    return id;
  },
});

export const getMobilePushTokensForUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const tokens = await ctx.db
      .query("mobile_push_tokens")
      .filter(({ eq, field }) => eq(field("userId"), args.userId))
      .withIndex("by_userId")
      .collect();

    return tokens;
  },
});
