/** biome-ignore-all lint/style/noNonNullAssertion: false positive */

import { ConvexError, v } from "convex/values";
import { api } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { assertCanManageShop } from "./authz";
import { errorMessages } from "./errors";
import { rateLimitOrThrow } from "./ratelimit";
import type { BarbershopMember } from "./tables";
import { tables } from "./tables";
import { getProfileByUserId } from "./userProfileData";

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
  handler: async (
    ctx,
    args,
  ): Promise<{
    roles: BarbershopMember["roles"] | undefined;
    isOwner: boolean | undefined;
  }> => {
    const barbershopMember = await ctx.runQuery(
      api.barbershopMembers.getByUserId,
      {
        userId: args.userId,
      },
    );

    return {
      roles: barbershopMember?.roles,
      isOwner: barbershopMember?.roles.includes("owner"),
    };
  },
});
