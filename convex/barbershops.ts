/** biome-ignore-all lint/style/noNonNullAssertion: false positive */

import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";
import { convexToZod } from "convex-helpers/server/zod4";
import { z } from "zod";
import { zMutation, zQuery } from ".";
import { api, internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { assertIsSubscribed } from "./acl";
import { authComponent } from "./auth";
import { assertOwner } from "./authz";
import { errorMessages } from "./errors";
import { barbershopGeospatial } from "./geospatial";
import { invites } from "./invitations";
import { rateLimitOrThrow } from "./ratelimit";
import { barbershops } from "./schema";
import { getProfileByUserId } from "./userProfileData";
import { DAY_MAP, formatPhoneNumber } from "./utils";

export const create = zMutation({
  args: z.object({
    barbershop: barbershops.tools.insert,
    ownerIsBarber: z.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await Promise.all([
      assertIsSubscribed(ctx, user.userId),
      rateLimitOrThrow(ctx, "createBarbershop", user._id),
    ]);

    const { barbershop, ownerIsBarber } = args;

    const existingByUuid = await getByUuidFn(ctx, barbershop.uuid);

    if (existingByUuid) {
      return existingByUuid._id;
    }

    // One barbershop per owner. A second shop trips the `.unique()` owner and
    // member lookups and 500s the whole owner dashboard.
    const existingByOwner = await ctx.db
      .query("barbershops")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user.userId!))
      .first();

    if (existingByOwner) {
      throw new ConvexError(errorMessages.barbershopAlreadyExists);
    }

    const barbershopId = await ctx.db.insert("barbershops", {
      ...barbershop,
      ownerId: user.userId ?? "",
      isActive: false,
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

    await ctx.runMutation(internal.barbershopMembers.create, {
      barbershopId,
      userProfileDataId: userProfile._id,
      isActive: true,
      joinedAt: Date.now(),
      roles,
    });

    return barbershopId;
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
    city: z.string().optional(),
    state: z.string().optional(),
    userId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const barbershops = await ctx.db
      .query("barbershops")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .filter((q) =>
        args.userId
          ? q.and(
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
            )
          : q.and(
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
        // if (barbershop.bannerUrl) {
        //   const isAlreadyUrl = /^https?:\/\//i.test(barbershop.bannerUrl);

        //   if (!isAlreadyUrl) {
        //     try {
        //       const url = await r2.getUrl(barbershop.bannerUrl);
        //       barbershop.bannerUrl = url === null ? undefined : url;
        //     } catch (error) {
        //       console.error(error);
        //     }
        //   }
        // }

        const services = await ctx.runQuery(api.barbershops.getServices, {
          id: barbershop._id,
        });

        barbershop.services = services.map((service) => service._id);
      }),
    );

    return barbershops.filter((barbershop) => barbershop.services?.length);
  },
});

export const getByUuid = zQuery({
  args: z.object({
    uuid: z.uuidv4(),
  }),
  handler: async (ctx, args) => {
    const barbershop = await getByUuidFn(ctx, args.uuid);

    if (!barbershop) return null;

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

export const deleteCascade = zMutation({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "deleteBarbershopCascade", user._id);

    const [barbershop, appointments] = await Promise.all([
      ctx.db.get(args.id),
      ctx.db
        .query("appointments")
        .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
        .collect(),
    ]);

    if (!barbershop || barbershop.ownerId !== user.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await Promise.all(
      appointments.map((appointment) => ctx.db.delete(appointment._id)),
    );

    const [services, assignments, members, reviews, metadata, pendingInvites] =
      await Promise.all([
        ctx.db
          .query("services")
          .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
          .collect(),
        ctx.db
          .query("barbershopMemberServices")
          .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
          .collect(),
        ctx.db
          .query("barbershopMembers")
          .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
          .collect(),
        ctx.db
          .query("reviews")
          .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
          .collect(),
        ctx.db
          .query("barbershopMetadata")
          .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
          .unique(),
        // Pending invites are stored in the invite-links component, scoped to
        // this barbershop's group.
        invites.listInvites(ctx, { groupId: args.id }),
      ]);

    await Promise.all([
      ...services.map((service) => ctx.db.delete(service._id)),
      ...assignments.map((assignment) => ctx.db.delete(assignment._id)),
      ...members.map((member) => ctx.db.delete(member._id)),
      ...reviews.map((review) => ctx.db.delete(review._id)),
      ...pendingInvites.map((inv) =>
        invites.revokeInvite(ctx, { inviteId: inv.inviteId }),
      ),
      ...(metadata?._id ? [ctx.db.delete(metadata._id)] : []),
      barbershopGeospatial.remove(ctx, args.id),
    ]);

    await ctx.db.delete(args.id);
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

export const getAvailabilityForDate = zQuery({
  args: z.object({
    barbershop: barbershops.tools.id,
    date: z.number(),
  }),
  handler: async (ctx, args) => {
    const barbershop = await ctx.db.get(args.barbershop.id);

    if (!barbershop) {
      return null;
    }

    const day = DAY_MAP[new Date(args.date).getDay()];

    const dayAvailability = barbershop.availability.find(
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

export const updateDayAvailability = zMutation({
  args: updateDayAvailabilitySchema,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "updateBarbershopDayAvailability", user._id);

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

    return updated;
  },
});

export const updateAvailability = zMutation({
  args: z.object({
    barbershop: barbershops.tools.id,
    data: barbershops.insertSchema.pick({ availability: true }),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "updateBarbershopAvailability", user._id);

    const barershop = await ctx.db.get(args.barbershop.id);

    if (!barershop) {
      return;
    }

    await ctx.db.patch(args.barbershop.id, {
      availability: args.data.availability,
    });
  },
});

export const update = zMutation({
  args: barbershops.tools.update,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user || user.userId !== args.data.ownerId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "updateBarbershop", user._id);

    const dataToUpdate = {
      ...args.data,
      ...(args.data.contactPhone && {
        contactPhone: formatPhoneNumber(args.data.contactPhone),
      }),
    };

    await ctx.db.patch(args.id, dataToUpdate);
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

export const setLogoKey = zMutation({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
    logoKey: z.string(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await Promise.all([
      assertOwner(ctx, args.barbershopId, user.userId),
      rateLimitOrThrow(ctx, "uploadBarbershopLogo", user.userId),
    ]);

    const barbershop = await ctx.db.get("barbershops", args.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    if (barbershop.logoKey) {
      try {
        await ctx.runMutation(api.r2.deleteR2Object, {
          key: barbershop.logoKey,
        });
      } catch {
        // Non-fatal: old object may already be gone
      }
    }

    await ctx.db.patch(args.barbershopId, { logoKey: args.logoKey });
  },
});

export const removeLogoKey = zMutation({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await Promise.all([
      assertOwner(ctx, args.barbershopId, user.userId),
      rateLimitOrThrow(ctx, "removeBarbershopLogo", user.userId),
    ]);

    const barbershop = await ctx.db.get("barbershops", args.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    if (barbershop.logoKey) {
      try {
        await ctx.runMutation(api.r2.deleteR2Object, {
          key: barbershop.logoKey,
        });
      } catch {
        // Non-fatal: old object may already be gone
      }
    }

    await ctx.db.patch(args.barbershopId, { logoKey: undefined });
  },
});
