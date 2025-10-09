import { expo } from "@better-auth/expo";
import type { GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { v } from "convex/values";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";

export const authComponent = createClient<DataModel>(components.betterAuth);

const siteUrl = process.env.WEB_URL ?? "";

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    trustedOrigins: ["panabarbero://", siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        enabled: true,
      },
    },
    plugins: [expo(), convex(), crossDomain({ siteUrl })],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // biome-ignore lint/suspicious/noExplicitAny: WIP
    return await authComponent.getAuthUser(ctx as any);
  },
});

export const checkIsBarber = query({
  args: {},
  returns: v.union(
    v.object({
      isBarber: v.literal(true),
      barbershops: v.array(
        v.object({
          _id: v.id("barbershops"),
          uuid: v.string(),
          name: v.string(),
        }),
      ),
    }),
    v.object({
      isBarber: v.literal(false),
    }),
  ),
  handler: async (ctx) => {
    // biome-ignore lint/suspicious/noExplicitAny: WIP
    const user = await authComponent.getAuthUser(ctx as any);

    if (!user || !user.userId) {
      return { isBarber: false as const };
    }

    const userId = user.userId;

    // Check if user is a barber
    const barberRecords = await ctx.db
      .query("barbers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (barberRecords.length === 0) {
      return { isBarber: false as const };
    }

    // Get all barbershops owned by this user
    const barbershops = await Promise.all(
      barberRecords.map(async (barber) => {
        const barbershop = await ctx.db.get(barber.barbershopId);
        if (!barbershop) return null;
        return {
          _id: barbershop._id,
          uuid: barbershop.uuid,
          name: barbershop.name,
        };
      }),
    );

    const validBarbershops = barbershops.filter((b) => b !== null);

    return {
      isBarber: true as const,
      barbershops: validBarbershops,
    };
  },
});
