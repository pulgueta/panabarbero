/** biome-ignore-all lint/style/noNonNullAssertion: false positive */

import { ConvexError, v } from "convex/values";

import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { assertCanManageShop, getOrganizationMembership } from "./authz";
import { errorMessages } from "./errors";
import { getPlanTypeFromSlug, PLAN_LIMITS } from "./lib/plans";
import { getPolarProducts } from "./lib/polarProducts";
import { rateLimitOrThrow } from "./ratelimit";
import type { BarbershopMember } from "./tables";
import { tables } from "./tables";
import { getProfileByUserId } from "./userProfileData";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get plan limits for an organization based on their active subscription
 */
async function getOrganizationPlanLimits(
  ctx: QueryCtx | MutationCtx,
  organizationId: string,
) {
  const subscription = await ctx.db
    .query("subscription")
    .withIndex("organizationId_status", (q) =>
      q.eq("organizationId", organizationId).eq("status", "active"),
    )
    .first();

  if (!subscription) {
    return PLAN_LIMITS.free;
  }

  const products = await getPolarProducts();
  const product = products.find((p) => p.productId === subscription.productId);
  const planType = product ? getPlanTypeFromSlug(product.slug) : "free";

  return PLAN_LIMITS[planType];
}

/**
 * Count members in an organization
 */
async function countOrganizationMembers(
  ctx: QueryCtx | MutationCtx,
  organizationId: string,
) {
  const members = await ctx.db
    .query("barbershopMembers")
    .withIndex("by_organizationId", (q) =>
      q.eq("organizationId", organizationId),
    )
    .filter((q) => q.eq(q.field("isActive"), true))
    .collect();

  return members.length;
}

// =============================================================================
// Internal Mutations
// =============================================================================

export const create = internalMutation({
  args: {
    barbershopMember: v.object({
      ...tables.barbershopMembers,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const barbershopMemberId = await ctx.db.insert("barbershopMembers", {
      ...args.barbershopMember,
      uuid: crypto.randomUUID(),
    });

    return barbershopMemberId;
  },
});

/**
 * Creates a barbershop member for an organization-linked barbershop
 * Checks organization member limits before creating
 */
export const createForOrganization = internalMutation({
  args: {
    barbershopId: v.id("barbershops"),
    userId: v.string(),
    userProfileDataId: v.id("userProfileData"),
    organizationId: v.string(),
    roles: v.array(v.union(v.literal("owner"), v.literal("barber"))),
  },
  handler: async (ctx, args) => {
    // Check organization member limits
    const planLimits = await getOrganizationPlanLimits(
      ctx,
      args.organizationId,
    );
    const currentMemberCount = await countOrganizationMembers(
      ctx,
      args.organizationId,
    );

    if (currentMemberCount >= planLimits.maxMembersPerOrganization) {
      throw new ConvexError(
        `Has alcanzado el límite de ${planLimits.maxMembersPerOrganization} miembros para tu plan. Actualiza tu plan para agregar más.`,
      );
    }

    // Check if user is already a member of this barbershop
    const existingMember = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingMember) {
      throw new ConvexError("El usuario ya es miembro de esta barbería");
    }

    const barbershopMemberId = await ctx.db.insert("barbershopMembers", {
      uuid: crypto.randomUUID(),
      barbershopId: args.barbershopId,
      userProfileDataId: args.userProfileDataId, // Legacy field
      userId: args.userId, // New field
      organizationId: args.organizationId, // New field
      roles: args.roles,
      isActive: true,
      joinedAt: Date.now(),
    });

    return barbershopMemberId;
  },
});

export const getByBarbershopId = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const membersWithName = await Promise.all(
      members.map(async (member) => {
        const memberProfile = await ctx.db.get(member.userProfileDataId);

        return {
          ...member,
          name: memberProfile?.name ?? "",
        };
      }),
    );

    return membersWithName;
  },
});

/**
 * Gets all barbershop memberships for a user (using new userId field)
 */
export const getByUserIdDirect = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<BarbershopMember[]> => {
    // First try the new userId index
    const membersByUserId = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (membersByUserId.length > 0) {
      return membersByUserId;
    }

    // Fallback to legacy userProfileDataId lookup
    const userProfile = await getProfileByUserId(ctx, args.userId);
    if (!userProfile) {
      return [];
    }

    return await ctx.db
      .query("barbershopMembers")
      .withIndex("by_userProfileDataId", (q) =>
        q.eq("userProfileDataId", userProfile._id),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
  },
});

/**
 * Gets organization member count and limits
 */
export const getOrganizationMemberUsage = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      return null;
    }

    const membership = await getOrganizationMembership(
      ctx,
      args.organizationId,
      user.userId,
    );

    if (!membership) {
      return null;
    }

    const planLimits = await getOrganizationPlanLimits(
      ctx,
      args.organizationId,
    );
    const currentCount = await countOrganizationMembers(
      ctx,
      args.organizationId,
    );

    return {
      currentCount,
      limit: planLimits.maxMembersPerOrganization,
      canAdd: currentCount < planLimits.maxMembersPerOrganization,
    };
  },
});

export const getBarberByUuid = query({
  args: { uuid: v.string() },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
      .unique();

    return member?.roles.includes("barber") ? member : null;
  },
});

export const update = mutation({
  args: {
    barbershopMemberId: v.id("barbershopMembers"),
    barbershopMember: v.object({
      ...tables.barbershopMembers,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    await rateLimitOrThrow(ctx, "updateBarbershopMember", user._id);

    const updatedBarbershopMember = await ctx.db.patch(
      args.barbershopMemberId,
      args.barbershopMember,
    );

    return updatedBarbershopMember;
  },
});

export const deleteMember = internalMutation({
  args: {
    barbershopMemberId: v.id("barbershopMembers"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const deletedBarbershopMember = await ctx.db.delete(
      args.barbershopMemberId,
    );

    return deletedBarbershopMember;
  },
});

export const removeBarberFromBarbershop = mutation({
  args: {
    barbershopMemberId: v.id("barbershopMembers"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "removeBarberFromBarbershop", user._id);

    const member = await ctx.db.get(args.barbershopMemberId);

    if (!member) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    await assertCanManageShop(ctx, member.barbershopId, user.userId);

    if (member.roles.includes("owner")) {
      throw new ConvexError("No puedes eliminar al dueño de la barbería");
    }

    const assignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.barbershopMemberId),
      )
      .collect();

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.barbershopMemberId),
      )
      .collect();

    await Promise.all(
      assignments.map((assignment) => ctx.db.delete(assignment._id)),
    );

    await Promise.all(
      appointments.map((appt) =>
        ctx.db.patch(appt._id, {
          deletedAt: Date.now(),
          status: "cancelled",
          notes:
            "Cita cancelada porque el barbero ya no pertenece a la barbería",
        }),
      ),
    );

    await ctx.db.delete(args.barbershopMemberId);

    return { success: true };
  },
});

export const isBarber = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return false;
    }

    const userProfile = await getProfileByUserId(ctx, args.userId!);

    if (!userProfile) {
      return false;
    }

    const barbershopMember = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_userProfileDataId", (q) =>
        q.eq("userProfileDataId", userProfile._id),
      )
      .first();

    if (!barbershopMember) return false;

    return barbershopMember.roles.includes("barber");
  },
});

export const getByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<BarbershopMember | null> => {
    const userProfile = await getProfileByUserId(ctx, args.userId);

    if (!userProfile?._id) {
      return null;
    }

    const barbershopMember = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_userProfileDataId", (q) =>
        q.eq("userProfileDataId", userProfile._id),
      )
      .first();

    return barbershopMember;
  },
});

export const getRolesByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const barbershopMember = await getByUserIdFn(ctx, args);

    return {
      roles: barbershopMember?.roles,
      isOwner: barbershopMember?.roles.includes("owner"),
    };
  },
});

export const getByUserIdFn = async (
  ctx: QueryCtx | MutationCtx,
  args: { userId: string },
) => {
  const profile = await getProfileByUserId(ctx, args.userId);

  if (!profile?._id) {
    return null;
  }

  return await ctx.db
    .query("barbershopMembers")
    .withIndex("by_userProfileDataId", (q) =>
      q.eq("userProfileDataId", profile._id),
    )
    .first();
};
