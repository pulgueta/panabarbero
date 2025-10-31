import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { tables } from "./tables";

export const createReview = mutation({
  args: {
    review: v.object({
      ...tables.reviews,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const reviewId = await ctx.db.insert("reviews", {
      ...args.review,
      userId: user.userId ?? "",
    });

    await ctx.runMutation(internal.barbershops.increaseBarbershopRating, {
      barbershopId: args.review.barbershopId,
    });

    return reviewId;
  },
});

export const getReviewsByBarbershopId = query({
  args: { barbershopId: v.id("barbershops") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .collect();

    return reviews;
  },
});

export const getReviewsByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return reviews;
  },
});

export const updateReview = mutation({
  args: {
    reviewId: v.id("reviews"),
    review: v.object({ ...tables.reviews }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const updated = await ctx.db.patch(args.reviewId, args.review);

    return updated;
  },
});

export const deleteReview = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    await ctx.db.delete(args.reviewId);
  },
});

export const canReview = query({
  args: {
    userId: v.optional(v.string()),
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return false;
    }

    if (args.userId !== user.userId) {
      return false;
    }

    const userHasAttended = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("status"), "completed"),
        ),
      )
      .first();

    return !!userHasAttended;
  },
});
