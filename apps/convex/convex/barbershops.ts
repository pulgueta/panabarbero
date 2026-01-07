/** biome-ignore-all lint/style/noNonNullAssertion: false positive */

import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { geospatial, r2 } from ".";
import { api, internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { errorMessages } from "./errors";
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
    ownerIsBarber: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const { barbershop, ownerIsBarber } = args;

    const barbershopId = await ctx.db.insert("barbershops", {
      ...barbershop,
      ownerId: user.userId ?? "",
      isActive: false,
      gracePeriodMinutes: 5,
    });

    await ctx.runMutation(
      internal.barbershopMetadata.createBarbershopInitialMetadata,
      {
        barbershopId,
      },
    );

    const userProfile = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId!))
      .unique();

    if (!userProfile) {
      return null;
    }

    const roles: Array<"owner" | "barber"> = ownerIsBarber
      ? ["owner", "barber"]
      : ["owner"];

    await ctx.runMutation(internal.barbershopMembers.createBarbershopMember, {
      barbershopMember: {
        barbershopId,
        userProfileDataId: userProfile._id,
        uuid: crypto.randomUUID(),
        isActive: true,
        joinedAt: Date.now(),
        roles,
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
        api.barbershops.getBarbershopServices,
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
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const barbershops = await ctx.db
      .query("barbershops")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .filter((q) =>
        q.and(
          q.neq(q.field("ownerId"), args.userId),
          args.city && args.state
            ? q.and(
                q.eq(q.field("city"), args.city),
                q.eq(q.field("state"), args.state),
              )
            : q.or(
                q.eq(q.field("city"), args.city),
                q.eq(q.field("state"), args.state),
              ),
        ),
      )
      .order("asc")
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
          api.barbershops.getBarbershopServices,
          {
            barbershopId: barbershop._id,
          },
        );

        barbershop.services = services.map((service) => service._id);
      }),
    );

    return barbershops.filter((barbershop) => barbershop.services?.length);
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

    const services = await ctx.runQuery(api.barbershops.getBarbershopServices, {
      barbershopId: barbershop?._id,
    });

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

export const getBarbershopServicesPaginated = query({
  args: {
    barbershopId: v.id("barbershops"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("services")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const deleteBarbershopCascade = mutation({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const barbershop = await ctx.db.get(args.barbershopId);

    if (!barbershop || barbershop.ownerId !== user.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .collect();

    await Promise.all(
      appointments.map((appointment) => ctx.db.delete(appointment._id)),
    );

    const services = await ctx.db
      .query("services")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .collect();

    await Promise.all(services.map((service) => ctx.db.delete(service._id)));

    const assignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .collect();

    await Promise.all(
      assignments.map((assignment) => ctx.db.delete(assignment._id)),
    );

    const members = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .collect();

    await Promise.all(members.map((member) => ctx.db.delete(member._id)));

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .collect();

    await Promise.all(reviews.map((review) => ctx.db.delete(review._id)));

    const metadata = await ctx.db
      .query("barbershopMetadata")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .unique();

    if (metadata?._id) {
      await ctx.db.delete(metadata._id);
    }

    await ctx.db.delete(args.barbershopId);
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
    lunchStart: v.optional(v.string()),
    lunchEnd: v.optional(v.string()),
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
      lunchStart: args.lunchStart,
      lunchEnd: args.lunchEnd,
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

export const updateBarbershopAvailability = mutation({
  args: {
    barbershopId: v.id("barbershops"),
    availability: tables.barbershops.availability,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const shop = await ctx.db.get(args.barbershopId);
    if (!shop) {
      throw new Error("Barbershop not found");
    }

    await ctx.db.patch(args.barbershopId, {
      availability: args.availability as typeof shop.availability,
    });

    return null;
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
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user || user.userId !== args.barbershop.ownerId) {
      throw new ConvexError(errorMessages.unauthorized);
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

export const getUserVisitedBarbershops = query({
  args: {
    userId: v.optional(v.string()),
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
      .take(5);

    const uniqueBarbershopIds = Array.from(
      new Set(appointments.map((appointment) => appointment.barbershopId)),
    );

    const barbershops = await Promise.all(
      uniqueBarbershopIds.map((barbershopId) => ctx.db.get(barbershopId)),
    );

    return barbershops;
  },
});

export const getBarbershopByOwnerId = query({
  args: {
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const barbershop = await ctx.db
      .query("barbershops")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.ownerId))
      .unique();

    if (barbershop) {
      const services = await ctx.runQuery(
        api.barbershops.getBarbershopServices,
        {
          barbershopId: barbershop._id,
        },
      );

      barbershop.services = services.map((service) => service._id);
    }

    return barbershop;
  },
});

export const getBarbershopByMemberUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const userProfile = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!userProfile) {
      return null;
    }

    const member = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_userProfileDataId", (q) =>
        q.eq("userProfileDataId", userProfile._id),
      )
      .first();

    if (!member) {
      return null;
    }

    return await ctx.db.get(member.barbershopId);
  },
});

export const getBarbershopById = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const barbershop = await ctx.db.get(args.barbershopId);

    const services = await ctx.runQuery(api.barbershops.getBarbershopServices, {
      barbershopId: args.barbershopId,
    });

    if (barbershop) {
      barbershop.services = services.map((service) => service._id);
    }

    return barbershop;
  },
});

export const getBarbershopsByIds = query({
  args: {
    barbershopIds: v.array(v.id("barbershops")),
  },
  handler: async (ctx, args) => {
    const barbershops = await Promise.all(
      args.barbershopIds.map(
        async (barbershopId) => await ctx.db.get(barbershopId),
      ),
    );

    return barbershops;
  },
});

export const getBarbershopsByName = query({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const barbershops = await ctx.db
      .query("barbershops")
      .withSearchIndex("by_name_search", (q) =>
        q.search("name", args.name ?? "barber"),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    await Promise.all(
      barbershops.map(async (barbershop) => {
        const services = await ctx.runQuery(
          api.barbershops.getBarbershopServices,
          {
            barbershopId: barbershop._id,
          },
        );

        barbershop.services = services.map((service) => service._id);
      }),
    );

    return barbershops.filter((barbershop) => barbershop.services?.length);
  },
});
