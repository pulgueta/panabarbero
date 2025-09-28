import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createBarbershop = mutation({
  args: {
    barbershop: v.object({
      name: v.string(),
      description: v.optional(v.string()),
      organizationId: v.string(),
      address: v.string(),
      coordinates: v.optional(v.object({ x: v.number(), y: v.number() })),
      contactPhone: v.optional(v.string()),
      socialMedia: v.optional(
        v.array(
          v.object({
            platform: v.union(
              v.literal("tiktok"),
              v.literal("instagram"),
              v.literal("facebook"),
              v.literal("twitter"),
              v.literal("youtube"),
            ),
            url: v.string(),
          }),
        ),
      ),
      isActive: v.boolean(),
      gracePeriodMinutes: v.optional(v.number()),
      ownerId: v.string(),
      availableDays: v.object({
        monday: v.union(
          v.object({ open: v.string(), close: v.string() }),
          v.null(),
        ),
        tuesday: v.union(
          v.object({ open: v.string(), close: v.string() }),
          v.null(),
        ),
        wednesday: v.union(
          v.object({ open: v.string(), close: v.string() }),
          v.null(),
        ),
        thursday: v.union(
          v.object({ open: v.string(), close: v.string() }),
          v.null(),
        ),
        friday: v.union(
          v.object({ open: v.string(), close: v.string() }),
          v.null(),
        ),
        saturday: v.union(
          v.object({ open: v.string(), close: v.string() }),
          v.null(),
        ),
        sunday: v.union(
          v.object({ open: v.string(), close: v.string() }),
          v.null(),
        ),
      }),
      city: v.string(),
      state: v.string(),
      zipCode: v.optional(v.string()),
      bannerUrl: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
      websiteUrl: v.optional(v.string()),
      logo: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { barbershop } = args;

    const barbershopId = await ctx.db.insert("barbershops", barbershop);

    return barbershopId;
  },
});

export const getBarbershops = query({
  args: {},
  handler: async (ctx) => {
    const barbershops = await ctx.db.query("barbershops").collect();

    return barbershops;
  },
});
