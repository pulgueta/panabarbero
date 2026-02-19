import { ConvexError, v } from "convex/values";
import { api } from "./_generated/api";
import { internalMutation, query } from "./_generated/server";
import { errorMessages } from "./errors";

export const createInitial = internalMutation({
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
    const reviews = await ctx.runQuery(api.reviews.getByBarbershopId, {
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

export const get = query({
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

export const incrementCompletedAppointments = internalMutation({
  args: {
    barbershopMetadataId: v.id("barbershopMetadata"),
  },
  handler: async (ctx, args) => {
    const metadata = await ctx.db.get(args.barbershopMetadataId);

    if (!metadata) {
      throw new ConvexError(errorMessages.notFound("metadata"));
    }

    await ctx.db.patch(args.barbershopMetadataId, {
      completedAppointments: (metadata.completedAppointments ?? 0) + 1,
    });
  },
});
