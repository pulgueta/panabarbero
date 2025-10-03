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
