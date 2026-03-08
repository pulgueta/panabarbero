import { ConvexError } from "convex/values";

import { zInternalMutation, zQuery } from ".";
import { errorMessages } from "./errors";
import { barbershopMetadata, barbershops } from "./schema";

export const createInitial = zInternalMutation({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const metadataId = await ctx.db.insert("barbershopMetadata", {
      uuid: crypto.randomUUID(),
      barbershopId: args.id,
      completedAppointments: 0,
      reviews: 0,
      rating: 0,
    });

    return metadataId;
  },
});

export const increaseBarbershopRating = zInternalMutation({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    // const reviews = await ctx.runQuery(api.reviews.getByBarbershopId, {
    //   barbershopId: args.id,
    // });

    const barbershop = await ctx.db.get(args.id);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbershop"));
    }

    // const averageRating =
    //   reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

    // if (barbershop.metadataId) {
    //   await ctx.db.patch(barbershop.metadataId, {
    //     rating: averageRating,
    //     reviews: reviews.length,
    //   });
    // }
  },
});

export const get = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    return await ctx.db
      .query("barbershopMetadata")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
      .unique();
  },
});

export const incrementCompletedAppointments = zInternalMutation({
  args: barbershopMetadata.tools.id,
  handler: async (ctx, args) => {
    const metadata = await ctx.db.get(args.id);

    if (!metadata) {
      throw new ConvexError(errorMessages.notFound("metadata"));
    }

    await ctx.db.patch(args.id, {
      completedAppointments: (metadata.completedAppointments ?? 0) + 1,
    });
  },
});
