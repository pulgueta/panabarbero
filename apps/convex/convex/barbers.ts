import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { tables } from "./tables";

export const createBarber = internalMutation({
  args: {
    barber: v.object({
      ...tables.barbers,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const { barber } = args;

    const barberId = await ctx.db.insert("barbers", {
      ...barber,
      userId: user.userId ?? "",
      uuid: crypto.randomUUID(),
    });

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
      .withIndex("by_barbershopId", ({ eq }) =>
        eq("barbershopId", args.barbershopId),
      )
      .collect();

    return barbers;
  },
});

export const getBarberByUuid = query({
  args: { uuid: v.string() },
  handler: async (ctx, args) => {
    const barber = await ctx.db
      .query("barbers")
      .withIndex("by_uuid", ({ eq }) => eq("uuid", args.uuid))
      .unique();

    return barber;
  },
});

export const getBarberByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const barber = await ctx.db
      .query("barbers")
      .withIndex("by_userId", ({ eq }) => eq("userId", args.userId))
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
    const user = await authComponent.getAuthUser(ctx);

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
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const deletedBarber = await ctx.db.delete(args.barberId);

    return deletedBarber;
  },
});
