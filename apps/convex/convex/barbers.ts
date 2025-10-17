import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { tables } from "./tables";

export const createBarber = internalMutation({
  args: {
    barber: v.object({
      ...tables.barbers,
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const { barber } = args;

    const barberId = await ctx.db.insert("barbers", barber);

    return barberId;
  },
});

export const getBarbersByBarbershopId = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const barbers = await ctx.db
      .query("barbers")
      .filter(({ eq, field }) => eq(field("barbershopId"), args.barbershopId))
      .withIndex("by_barbershopId")
      .collect();

    return barbers;
  },
});

export const getBarberByUuid = query({
  args: { uuid: v.string() },
  handler: async (ctx, args) => {
    const barber = await ctx.db
      .query("barbers")
      .filter(({ eq, field }) => eq(field("uuid"), args.uuid))
      .withIndex("by_uuid")
      .unique();

    return barber;
  },
});

export const getBarberByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const barber = await ctx.db
      .query("barbers")
      .filter(({ eq, field }) => eq(field("userId"), args.userId))
      .withIndex("by_userId")
      .unique();

    return barber;
  },
});

export const updateBarber = mutation({
  args: {
    barberId: v.id("barbers"),
    barber: v.object({
      ...tables.barbers,
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const updatedBarber = await ctx.db.patch(args.barberId, args.barber);

    return updatedBarber;
  },
});

export const deleteBarber = mutation({
  args: {
    barberId: v.id("barbers"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const deletedBarber = await ctx.db.delete(args.barberId);

    return deletedBarber;
  },
});
