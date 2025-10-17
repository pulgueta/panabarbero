import { v } from "convex/values";
import { geospatial } from ".";
import { api, internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { tables } from "./tables";

export const createBarbershop = mutation({
  args: {
    barbershop: v.object({
      ...tables.barbershops,
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const { barbershop } = args;

    const barbershopId = await ctx.db.insert("barbershops", {
      ...barbershop,
      metadata: {
        completedAppointments: 0,
        contactEmail: barbershop.metadata?.contactEmail ?? "",
        rating: 0,
        reviews: 0,
        socialMedia: barbershop.metadata?.socialMedia ?? [],
        websiteUrl: barbershop.metadata?.websiteUrl ?? "",
      },
    });

    if (barbershop.coordinates) {
      await geospatial.insert(
        ctx,
        "Barbershop coordinates",
        {
          latitude: barbershop.coordinates.x,
          longitude: barbershop.coordinates.y,
        },
        {
          key: barbershopId,
        },
      );
    }

    await ctx.runMutation(internal.barbers.createBarber, {
      barber: {
        barbershopId,
        userId: user.subject,
        uuid: crypto.randomUUID(),
      },
    });

    return barbershopId;
  },
});

export const getBarbershops = query({
  handler: async (ctx) => {
    const barbershops = await ctx.db.query("barbershops").collect();

    for (const barbershop of barbershops) {
      const services = await ctx.runQuery(
        internal.services.getServicesByBarbershopId,
        {
          barbershopId: barbershop._id,
        },
      );

      barbershop.services = services.map((service) => service._id);
    }

    return barbershops;
  },
});
export const getActiveBarbershops = query({
  handler: async (ctx) => {
    const barbershops = await ctx.db
      .query("barbershops")
      .filter(({ field, eq }) => eq(field("isActive"), true))
      .collect();

    for (const barbershop of barbershops) {
      const services = await ctx.runQuery(
        internal.services.getServicesByBarbershopId,
        {
          barbershopId: barbershop._id,
        },
      );

      barbershop.services = services.map((service) => service._id);
    }

    return barbershops;
  },
});

export const getBarbershopByUuid = query({
  args: {
    uuid: v.string(),
  },
  handler: async (ctx, args) => {
    const barbershop = await ctx.db
      .query("barbershops")
      .filter(({ eq, field }) => eq(field("uuid"), args.uuid))
      .withIndex("by_uuid")
      .unique();

    return barbershop;
  },
});

export const getBarbershopServices = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("services")
      .filter(({ eq, field }) => eq(field("barbershopId"), args.barbershopId))
      .collect();

    return services;
  },
});

export const getBarbershopAvailabilityForDate = query({
  args: {
    barbershopId: v.id("barbershops"),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    const shop = await ctx.db.get(args.barbershopId);
    if (!shop) return null;

    const dayIdx = new Date(args.date).getDay();
    const dayMap = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ] as const;
    const day = dayMap[dayIdx];

    const dayAvailability = shop.availability.find(
      (a) => a.weekDay.day === day,
    );

    if (!dayAvailability) {
      return { isActive: false, openAt: undefined, closeAt: undefined };
    }

    return {
      isActive: dayAvailability.weekDay.isActive,
      openAt: dayAvailability.openAt,
      closeAt: dayAvailability.closeAt,
    };
  },
});

export const updateBarbershopDayAvailability = mutation({
  args: {
    barbershopId: v.id("barbershops"),
    day: v.union(
      v.literal("monday"),
      v.literal("tuesday"),
      v.literal("wednesday"),
      v.literal("thursday"),
      v.literal("friday"),
      v.literal("saturday"),
      v.literal("sunday"),
    ),
    isActive: v.boolean(),
    openAt: v.optional(v.string()),
    closeAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const shop = await ctx.db.get(args.barbershopId);
    if (!shop) throw new Error("Barbershop not found");

    const idx = shop.availability.findIndex((a) => a.weekDay.day === args.day);

    const newEntry = {
      weekDay: { day: args.day, isActive: args.isActive },
      openAt: args.openAt,
      closeAt: args.closeAt,
    };

    const newAvailability = shop.availability.slice();
    if (idx >= 0) {
      newAvailability[idx] =
        newEntry as unknown as (typeof shop.availability)[number];
    } else {
      newAvailability.push(
        newEntry as unknown as (typeof shop.availability)[number],
      );
    }

    const updated = await ctx.db.patch(args.barbershopId, {
      availability: newAvailability,
    });

    return updated;
  },
});

export const updateBarbershop = mutation({
  args: {
    barbershopId: v.id("barbershops"),
    barbershop: v.object({
      ...tables.barbershops,
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    await ctx.db.patch(args.barbershopId, args.barbershop);

    if (args.barbershop.coordinates) {
      await geospatial.insert(
        ctx,
        "Barbershop coordinates",
        {
          latitude: args.barbershop.coordinates.x,
          longitude: args.barbershop.coordinates.y,
        },
        {
          key: args.barbershopId,
        },
      );
    }
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

    const averageRating =
      reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

    await ctx.db.patch(args.barbershopId, {
      metadata: {
        rating: averageRating,
        reviews: reviews.length,
      },
    });
  },
});
