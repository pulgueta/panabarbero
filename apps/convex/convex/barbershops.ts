import { v } from "convex/values";
import { geospatial, r2 } from ".";
import { api, internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { tables } from "./tables";

export const saveBarbershopBanner = internalMutation({
  args: {
    storageId: v.id("_storage"),
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const updatedBarbershop = await ctx.db.patch(args.barbershopId, {
      bannerUrl: args.storageId,
    });

    return updatedBarbershop;
  },
});

export const createBarbershop = mutation({
  args: {
    barbershop: v.object({
      ...tables.barbershops,
    }),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const { barbershop } = args;

    const barbershopId = await ctx.db.insert("barbershops", {
      ...barbershop,
      uuid: crypto.randomUUID(),
      ownerId: user.userId ?? "",
      isActive: false,
      gracePeriodMinutes: 5,
      metadata: {
        completedAppointments: 0,
        rating: 0,
        reviews: 0,
      },
    });

    if (args.storageId) {
      await ctx.runMutation(internal.barbershops.saveBarbershopBanner, {
        barbershopId,
        storageId: args.storageId,
      });
    }

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
        userId: user.userId ?? "",
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
        api.services.getServicesByBarbershopId,
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
  args: {
    city: v.optional(v.string()),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const barbershops = await ctx.db
      .query("barbershops")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .filter((q) =>
        args.city && args.state
          ? q.and(
              q.eq(q.field("city"), args.city),
              q.eq(q.field("state"), args.state),
            )
          : q.or(
              q.eq(q.field("city"), args.city),
              q.eq(q.field("state"), args.state),
            ),
      )
      .collect();

    await Promise.all(
      barbershops.map(async (barbershop) => {
        if (barbershop.bannerUrl) {
          const isAlreadyUrl = /^https?:\/\//i.test(barbershop.bannerUrl);

          if (!isAlreadyUrl) {
            try {
              const url = await r2.getUrl(barbershop.bannerUrl);
              barbershop.bannerUrl = url === null ? undefined : url;
            } catch (error) {
              console.error(error);
            }
          }
        }

        const services = await ctx.runQuery(
          api.services.getServicesByBarbershopId,
          {
            barbershopId: barbershop._id,
          },
        );

        barbershop.services = services.map((service) => service._id);
      }),
    );

    return barbershops;
  },
});

export const getBarbershopByUuid = query({
  args: {
    uuid: v.optional(tables.barbershops.uuid),
  },
  handler: async (ctx, args) => {
    const barbershop = await ctx.db
      .query("barbershops")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid ?? ""))
      .unique();

    if (!barbershop) return null;

    const services = await ctx.runQuery(
      api.services.getServicesByBarbershopId,
      {
        barbershopId: barbershop?._id,
      },
    );

    barbershop.services = services.map((service) => service._id);

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
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
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
    const user = await authComponent.getAuthUser(ctx);

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
    storageId: v.optional(v.id("_storage")),
    barbershop: v.object({
      ...tables.barbershops,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    if (user.userId !== args.barbershop.ownerId) {
      throw new Error("User not authorized", {
        cause: user,
      });
    }

    await ctx.db.patch(args.barbershopId, args.barbershop);

    if (args.storageId) {
      await ctx.runMutation(internal.barbershops.saveBarbershopBanner, {
        barbershopId: args.barbershopId,
        storageId: args.storageId,
      });
    }

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

export const getUserVisitedBarbershops = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return [];
    }

    if (args.userId !== user.userId) {
      return [];
    }

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId ?? ""))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .order("desc")
      .collect();

    const barbershops = await Promise.all(
      appointments.map(
        async (appointment) => await ctx.db.get(appointment.barbershopId),
      ),
    );

    return barbershops;
  },
});

export const getBarbershopsByName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const barbershops = await ctx.db
      .query("barbershops")
      .withSearchIndex("by_name_search", (q) =>
        q.search("name", args.name ? args.name : "barber").eq("isActive", true),
      )
      .collect();

    await Promise.all(
      barbershops.map(async (barbershop) => {
        const services = await ctx.runQuery(
          api.services.getServicesByBarbershopId,
          {
            barbershopId: barbershop._id,
          },
        );

        barbershop.services = services.map((service) => service._id);
      }),
    );

    return barbershops;
  },
});

export const isBarbershopOwner = query({
  args: {
    barbershopId: v.id("barbershops"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return false;
    }

    const barbershop = await ctx.db.get(args.barbershopId);

    if (!barbershop) {
      return false;
    }

    if (barbershop.ownerId !== user.userId) {
      return false;
    } else {
      return barbershop;
    }
  },
});
