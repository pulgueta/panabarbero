import { ConvexError, v } from "convex/values";
import { api } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";
import { errorMessages } from "./errors";

export const createBarbershopInitialMetadata = internalMutation({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const metadataId = await ctx.db.insert("barbershopMetadata", {
      uuid: crypto.randomUUID(),
      barbershopId: args.barbershopId,
      completedAppointments: 0,
      reviews: 0,
      rating: 0,
    });

    return metadataId;
  },
});

export const increaseBarbershopRating = internalMutation({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.runQuery(api.reviews.getReviewsByBarbershopId, {
      barbershopId: args.barbershopId,
    });
    const barbershop = await ctx.db.get(args.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbershop"));
    }

    const averageRating =
      reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

    if (barbershop.metadataId) {
      await ctx.db.patch(barbershop.metadataId, {
        rating: averageRating,
        reviews: reviews.length,
      });
    }
  },
});

export const getBarbershopMetadata = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("barbershopMetadata")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .unique();
  },
});
