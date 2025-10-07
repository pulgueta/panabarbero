import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tables } from "./tables";

export const createReview = mutation({
  args: {
    review: v.object({
      ...tables.reviews,
    }),
  },
  handler: async (ctx, args) => {
    const reviewId = await ctx.db.insert("reviews", args.review);

    return reviewId;
  },
});

export const getReviewsByBarbershopId = query({
  args: { barbershopId: v.id("barbershops") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .filter(({ eq, field }) => eq(field("barbershopId"), args.barbershopId))
      .withIndex("by_barbershopId")
      .collect();

    return reviews;
  },
});

export const getReviewsByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .filter(({ eq, field }) => eq(field("userId"), args.userId))
      .withIndex("by_userId")
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
    const updated = await ctx.db.patch(args.reviewId, args.review);

    return updated;
  },
});

export const deleteReview = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.reviewId);
  },
});
