/** biome-ignore-all lint/style/noNonNullAssertion: false positive */

import { ConvexError } from "convex/values";
import { z } from "zod";

import { zInternalMutation, zMutation, zQuery } from ".";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { assertCanManageShop } from "./authz";
import { errorMessages } from "./errors";
import { rateLimitOrThrow } from "./ratelimit";
import { barbershopMembers, barbershops } from "./schema";
import { getProfileByUserId } from "./userProfileData";

export const create = zInternalMutation({
  args: barbershopMembers.tools.insert,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const barbershopMemberId = await ctx.db.insert("barbershopMembers", args);

    return barbershopMemberId;
  },
});

export const getByBarbershopId = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
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

export const update = zMutation({
  args: barbershopMembers.tools.update,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    await rateLimitOrThrow(ctx, "updateBarbershopMember", user._id);

    const updatedBarbershopMember = await ctx.db.patch(args.id, args.data);

    return updatedBarbershopMember;
  },
});

export const deleteMember = zInternalMutation({
  args: barbershopMembers.tools.id,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await ctx.db.delete(args.id);
  },
});

export const removeBarberFromBarbershop = zMutation({
  args: barbershopMembers.tools.id,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "removeBarberFromBarbershop", user._id);

    const member = await ctx.db.get(args.id);

    if (!member) {
      return;
    }

    await assertCanManageShop(ctx, member.barbershopId, user.userId);

    if (member.roles.includes("owner")) {
      throw new ConvexError("No puedes eliminar al dueño de la barbería");
    }

    const assignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.id),
      )
      .collect();

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.id),
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

    await ctx.db.delete(args.id);
  },
});

export const isBarber = zQuery({
  args: z.object({
    userId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId || !args.userId || user.userId !== args.userId) {
      return false;
    }

    const userProfile = await getProfileByUserId(ctx, args.userId!);

    if (!userProfile) {
      return false;
    }

    const barbershopMember = await getByUserIdFn(ctx, { userId: args.userId });

    return barbershopMember?.roles.includes("barber") ?? false;
  },
});

export const getByUserId = zQuery({
  args: z.object({
    userId: z.string(),
  }),
  handler: async (ctx, args) => {
    const userProfile = await getProfileByUserId(ctx, args.userId);

    if (!userProfile?._id) {
      return null;
    }

    const barbershopMember = await getByUserIdFn(ctx, args);

    return barbershopMember;
  },
});

export const getRolesByUserId = zQuery({
  args: z.object({
    userId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    if (!args.userId) {
      return {
        roles: [],
        isOwner: false,
      };
    }

    const barbershopMember = await getByUserIdFn(ctx, { userId: args.userId });

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
    .unique();
};
