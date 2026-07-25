/** biome-ignore-all lint/style/noNonNullAssertion: false positive */

import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";
import { convexToZod, zid } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zAuthMutation, zInternalMutation, zQuery } from ".";
import { api, internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { assertIsSubscribed } from "./acl";
import { getBarbershopRatingValue } from "./aggregates";
import { groupIdentifyBarbershop, track } from "./analytics";
import { authkit } from "./auth.config";
import { assertOwner } from "./authz";
import { cascadeDeleteBarbershop } from "./barbershopCascade";
import { hasUnexpiredCheckout } from "./credits";
import { errorMessages } from "./errors";
import { ensureFreeSubscription } from "./mercadopagoSubscriptions";
import { rateLimitOrThrow } from "./ratelimit";
import { barbershops } from "./schema";
import { getProfileByUserId } from "./userProfileData";
import { formatPhoneNumber } from "./utils";

export const create = zAuthMutation({
  args: z.object({
    barbershop: barbershops.tools.insert.omit({ uuid: true }),
    ownerIsBarber: z.boolean(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    // Every authenticated owner is entitled to at least the free plan; seed the
    // local free entitlement idempotently so `assertIsSubscribed` resolves when
    // no paid subscription exists.
    await ensureFreeSubscription(ctx, userId);

    await Promise.all([
      assertIsSubscribed(ctx, userId),
      rateLimitOrThrow(ctx, "createBarbershop", userId),
    ]);

    const { barbershop, ownerIsBarber } = args;

    // One barbershop per owner. A second shop trips the `.unique()` owner and
    // member lookups and 500s the whole owner dashboard.
    const existingByOwner = await ctx.db
      .query("barbershops")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .first();

    if (existingByOwner) {
      throw new ConvexError(errorMessages.barbershopAlreadyExists);
    }

    const barbershopId = await ctx.db.insert("barbershops", {
      ...barbershop,
      ownerId: userId,
      isActive: false,
      uuid: crypto.randomUUID(),
    });

    const metadataId = await ctx.runMutation(
      internal.barbershopMetadata.createInitial,
      {
        id: barbershopId,
      },
    );

    await ctx.db.patch(barbershopId, {
      metadataId,
    });

    let userProfile = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    // The `user.created` webhook may not have landed yet for brand-new users —
    // create the profile inline so the owner membership never goes missing.
    if (!userProfile) {
      const authUser = await authkit.getAuthUser(ctx);

      if (!authUser) {
        return null;
      }

      const profileId = await ctx.db.insert("userProfileData", {
        userId,
        email: authUser.email,
        name:
          [authUser.firstName, authUser.lastName].filter(Boolean).join(" ") ||
          undefined,
        notificationsPreferences: [
          { type: "email", enabled: true },
          { type: "sms", enabled: false },
        ],
      });

      userProfile = await ctx.db.get(profileId);
    }

    if (!userProfile) {
      return null;
    }

    const roles: Array<"owner" | "barber"> = ownerIsBarber
      ? ["owner", "barber"]
      : ["owner"];

    await ctx.runMutation(internal.barbershopMembers.create, {
      barbershopId,
      userProfileDataId: userProfile._id,
      isActive: true,
      joinedAt: Date.now(),
      roles,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.workosOrgs.createOrganizationForBarbershop,
      {
        barbershopId,
        name: barbershop.name,
        ownerUserId: userId,
      },
    );

    await track(ctx, {
      distinctId: userId,
      event: "barbershop_created",
      properties: {
        barbershopId,
        name: barbershop.name,
        city: barbershop.city,
        state: barbershop.state,
        ownerIsBarber,
      },
      groups: { barbershop: barbershopId },
    });

    await groupIdentifyBarbershop(ctx, barbershopId, {
      name: barbershop.name,
      city: barbershop.city,
      state: barbershop.state,
      ownerIsBarber,
    });

    return barbershopId;
  },
});

export const setWorkosOrganizationId = zInternalMutation({
  args: z.object({
    id: zid("barbershops"),
    workosOrganizationId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      workosOrganizationId: args.workosOrganizationId,
    });
  },
});

export const get = zQuery({
  handler: async (ctx) => {
    const barbershops = await ctx.db.query("barbershops").collect();

    const allServices = await Promise.all(
      barbershops.map((barbershop) =>
        ctx.runQuery(api.barbershops.getServices, { id: barbershop._id }),
      ),
    );

    for (let i = 0; i < barbershops.length; i++) {
      barbershops[i].services = allServices[i].map((service) => service._id);
    }

    return barbershops;
  },
});

export const getActive = zQuery({
  args: z.object({
    // Location is REQUIRED: it is what bounds this read. Without it the query
    // would scan every active barbershop in the country and then fan out a
    // services read + aggregate read per row. The listing route holds the
    // query until the visitor has picked a city.
    city: z.string().min(1),
    state: z.string().min(1),
    userId: z.string().optional(),
    minRating: z.number().min(0).max(5).optional(),
    minReviews: z.number().int().min(0).optional(),
    sortBy: z.enum(["rating", "reviews", "name"]).optional(),
  }),
  handler: async (ctx, args) => {
    // Fully index-backed read (city + state + isActive), then JS-residual
    // filtering: owner exclusion here, rating/review thresholds after the
    // aggregate decorates each row.
    const rows = await ctx.db
      .query("barbershops")
      .withIndex("by_city_and_state_and_isActive", (q) =>
        q.eq("city", args.city).eq("state", args.state).eq("isActive", true),
      )
      .order("asc")
      .collect();

    const barbershops = args.userId
      ? rows.filter((barbershop) => barbershop.ownerId !== args.userId)
      : rows;

    const withRatings = await Promise.all(
      barbershops.map(async (barbershop) => {
        // Read services directly off the index rather than `ctx.runQuery` — a
        // cross-function call spins a fresh sub-transaction per row, which is the
        // real fan-out cost here. Ratings stay on the aggregate
        // (`getBarbershopRatingValue`, O(log n)): that aggregate already *is* the
        // denormalized rating read model, so there is nothing to copy onto the doc.
        const [services, { average, count }] = await Promise.all([
          ctx.db
            .query("services")
            .withIndex("by_barbershopId", (q) =>
              q.eq("barbershopId", barbershop._id),
            )
            .collect(),
          getBarbershopRatingValue(ctx, barbershop._id),
        ]);

        barbershop.services = services.map((service) => service._id);

        return { ...barbershop, averageRating: average, reviewCount: count };
      }),
    );

    const filtered = withRatings.filter(
      (barbershop) =>
        barbershop.services?.length &&
        (barbershop.averageRating ?? 0) >= (args.minRating ?? 0) &&
        (barbershop.reviewCount ?? 0) >= (args.minReviews ?? 0),
    );

    const sorters: Record<
      NonNullable<typeof args.sortBy>,
      (a: (typeof filtered)[number], b: (typeof filtered)[number]) => number
    > = {
      rating: (a, b) =>
        (b.averageRating ?? 0) - (a.averageRating ?? 0) ||
        (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
      reviews: (a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
      name: (a, b) => a.name.localeCompare(b.name, "es"),
    };

    return filtered.sort(sorters[args.sortBy ?? "rating"]);
  },
});

export const getByUuid = zQuery({
  args: z.object({
    uuid: z.uuidv4(),
  }),
  handler: async (ctx, args) => {
    const barbershop = await getByUuidFn(ctx, args.uuid);

    if (!barbershop || !barbershop.isActive) return null;

    const services = await ctx.runQuery(api.barbershops.getServices, {
      id: barbershop._id,
    });

    barbershop.services = services.map((service) => service._id);

    return barbershop;
  },
});

export async function getByUuidFn(ctx: QueryCtx | MutationCtx, uuid: string) {
  const barbershop = await ctx.db
    .query("barbershops")
    .withIndex("by_uuid", (q) => q.eq("uuid", uuid))
    .unique();

  return barbershop;
}

export const getServices = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("services")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
      .collect();

    return services;
  },
});

export const getServicesPaginated = zQuery({
  args: z.object({
    barbershop: barbershops.tools.id,
    paginationOpts: convexToZod(paginationOptsValidator),
  }),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("services")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershop.id),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const deleteCascade = zAuthMutation({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "deleteBarbershopCascade", userId);

    const barbershop = await ctx.db.get(args.id);

    if (!barbershop || barbershop.ownerId !== userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    if (await hasUnexpiredCheckout(ctx, userId, Date.now())) {
      throw new ConvexError(
        "Espera a que venza tu checkout de créditos antes de eliminar la barbería.",
      );
    }

    await cascadeDeleteBarbershop(ctx, barbershop);
  },
});

export const getAvailability = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const barbershop = await ctx.db.get(args.id);

    if (!barbershop) {
      return [];
    }

    return barbershop.availability;
  },
});

export const updateDayAvailabilitySchema = z.object({
  barbershop: barbershops.tools.id,
  day: z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]),
  isActive: z.boolean(),
  openAt: z.string().optional(),
  closeAt: z.string().optional(),
  lunchStart: z.string().optional(),
  lunchEnd: z.string().optional(),
});

export const updateDayAvailability = zAuthMutation({
  args: updateDayAvailabilitySchema,
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "updateBarbershopDayAvailability", userId);

    const shop = await ctx.db.get(args.barbershop.id);

    if (!shop) {
      return;
    }

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

    const updated = await ctx.db.patch(args.barbershop.id, {
      availability: newAvailability,
    });

    // Keep the shop's Pana knowledge base in sync (no-op unless premium).
    await ctx.scheduler.runAfter(0, internal.aiRag.reindexShopKnowledge, {
      barbershopId: args.barbershop.id,
    });

    return updated;
  },
});

export const updateAvailability = zAuthMutation({
  args: z.object({
    barbershop: barbershops.tools.id,
    data: barbershops.insertSchema.pick({ availability: true }),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "updateBarbershopAvailability", userId);

    const barershop = await ctx.db.get(args.barbershop.id);

    if (!barershop) {
      return;
    }

    await ctx.db.patch(args.barbershop.id, {
      availability: args.data.availability,
    });

    // Keep the shop's Pana knowledge base in sync (no-op unless premium).
    await ctx.scheduler.runAfter(0, internal.aiRag.reindexShopKnowledge, {
      barbershopId: args.barbershop.id,
    });
  },
});

export const update = zAuthMutation({
  args: barbershops.tools.update,
  handler: async (ctx, args) => {
    const { userId } = ctx;

    if (userId !== args.data.ownerId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "updateBarbershop", userId);

    const existing = await ctx.db.get(args.id);

    if (!existing) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    // Org ids are managed exclusively by the workosOrgs sync below.
    const { workosOrganizationId: _ignored, ...data } = args.data;

    const dataToUpdate = {
      ...data,
      ...(data.contactPhone && {
        contactPhone: formatPhoneNumber(data.contactPhone),
      }),
    };

    await ctx.db.patch(args.id, dataToUpdate);

    // Keep the shop's Pana knowledge base in sync (no-op unless premium).
    await ctx.scheduler.runAfter(0, internal.aiRag.reindexShopKnowledge, {
      barbershopId: args.id,
    });

    if (
      data.name &&
      data.name !== existing.name &&
      existing.workosOrganizationId
    ) {
      await ctx.scheduler.runAfter(0, internal.workosOrgs.renameOrganization, {
        workosOrganizationId: existing.workosOrganizationId,
        name: data.name,
      });
    }

    if (data.isActive === false && existing.workosOrganizationId) {
      await ctx.scheduler.runAfter(0, internal.workosOrgs.deleteOrganization, {
        workosOrganizationId: existing.workosOrganizationId,
      });
      await ctx.db.patch(args.id, { workosOrganizationId: undefined });
    } else if (data.isActive === true && !existing.workosOrganizationId) {
      // Reactivation after a deactivate gets a fresh organization.
      await ctx.scheduler.runAfter(
        0,
        internal.workosOrgs.createOrganizationForBarbershop,
        {
          barbershopId: args.id,
          name: data.name ?? existing.name,
          ownerUserId: existing.ownerId,
        },
      );
    }
  },
});

export const getByOwnerId = zQuery({
  args: z.object({
    ownerId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    if (!args.ownerId) {
      return null;
    }

    const barbershop = await ctx.db
      .query("barbershops")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.ownerId!))
      // `.first()` not `.unique()`: degrade gracefully if a legacy duplicate
      // exists instead of throwing and 500ing the dashboard.
      .first();

    if (barbershop) {
      const services = await ctx.runQuery(api.barbershops.getServices, {
        id: barbershop._id,
      });

      barbershop.services = services.map((service) => service._id);
    }

    return barbershop;
  },
});

export const getByMemberUserId = zQuery({
  args: z.object({
    userId: z.string(),
  }),
  handler: async (ctx, args) => {
    const userProfile = await getProfileByUserId(ctx, args.userId);

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

export const getByIds = zQuery({
  args: z.object({
    barbershopIds: barbershops.tools.id.array(),
  }),
  handler: async (ctx, args) => {
    const barbershops = await Promise.all(
      args.barbershopIds.map(
        async (barbershopId) => await ctx.db.get(barbershopId.id),
      ),
    );

    return barbershops;
  },
});

export const getByName = zQuery({
  args: z.object({
    name: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const barbershops = await ctx.db
      .query("barbershops")
      .withSearchIndex("by_name_search", (q) =>
        args.state && args.city
          ? q
              .search("name", args.name ?? "barber")
              .eq("state", args.state)
              .eq("city", args.city)
              .eq("isActive", true)
          : q.search("name", args.name ?? "barber").eq("isActive", true),
      )
      .take(50);

    await Promise.all(
      barbershops.map(async (barbershop) => {
        const services = await ctx.runQuery(api.barbershops.getServices, {
          id: barbershop._id,
        });

        barbershop.services = services.map((service) => service._id);
      }),
    );

    return barbershops;
  },
});

export const setLogoKey = zAuthMutation({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
    logoKey: z.string(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await Promise.all([
      assertOwner(ctx, args.barbershopId, userId),
      rateLimitOrThrow(ctx, "uploadBarbershopLogo", userId),
    ]);

    const barbershop = await ctx.db.get("barbershops", args.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    if (barbershop.logoKey) {
      try {
        await ctx.runMutation(internal.r2.deleteR2Object, {
          key: barbershop.logoKey,
        });
      } catch {
        // Non-fatal: old object may already be gone
      }
    }

    await ctx.db.patch(args.barbershopId, { logoKey: args.logoKey });
  },
});

export const removeLogoKey = zAuthMutation({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await Promise.all([
      assertOwner(ctx, args.barbershopId, userId),
      rateLimitOrThrow(ctx, "removeBarbershopLogo", userId),
    ]);

    const barbershop = await ctx.db.get("barbershops", args.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    if (barbershop.logoKey) {
      try {
        await ctx.runMutation(internal.r2.deleteR2Object, {
          key: barbershop.logoKey,
        });
      } catch {
        // Non-fatal: old object may already be gone
      }
    }

    await ctx.db.patch(args.barbershopId, { logoKey: undefined });
  },
});
