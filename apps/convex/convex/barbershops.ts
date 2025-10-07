import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

import { tables } from "./tables";

export const createBarbershop = mutation({
  args: {
    barbershop: v.object({
      ...tables.barbershops,
    }),
  },
  handler: async (ctx, args) => {
    const { barbershop } = args;

    const barbershopId = await ctx.db.insert("barbershops", barbershop);

    return barbershopId;
  },
});

export const getBarbershops = query({
  handler: async (ctx) => {
    const barbershops = await ctx.db.query("barbershops").collect();

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
