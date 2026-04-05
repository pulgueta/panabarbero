/** biome-ignore-all lint/style/noNonNullAssertion: false positive */

import { ConvexError } from "convex/values";
import { z } from "zod";

import { zInternalMutation, zMutation, zQuery } from ".";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";
import { assertCanManageShop, assertShopRole, getBetterAuthUser } from "./authz";
import { errorMessages } from "./errors";
import { rateLimitOrThrow } from "./ratelimit";
import type { Barbershop } from "./schema";
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
  args: barbershops.tools.id.shape,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      return [];
    }

    const members = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const membersWithName = await Promise.all(
      members.map(async (member) => {
        const memberProfile = await ctx.db.get(member.userProfileDataId);
        const betterAuthUser = await getBetterAuthUser(
          ctx,
          member.userProfileDataId,
        );

        return {
          ...member,
          name: memberProfile?.name ?? "",
          avatarUrl: betterAuthUser?.image ?? "",
        };
      }),
    );

    return membersWithName.filter((member) => member.roles.includes("barber"));
  },
});

export const update = zMutation({
  args: barbershopMembers.tools.update,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
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
  args: z.object({
    ...barbershopMembers.tools.id.shape,
    force: z.boolean().optional(),
  }),
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

    const now = Date.now();

    // Find impacted appointments: future/upcoming, not deleted, not cancelled/completed/no-show
    const impactedAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.id),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.gte(q.field("date"), now),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "rescheduled"),
          ),
        ),
      )
      .collect();

    // 2-step confirmation: if not force and impacted > 0, throw error with count
    if (!args.force && impactedAppointments.length > 0) {
      throw new ConvexError(`WILL_CANCEL:${impactedAppointments.length}`);
    }

    const [barbershop, barberProfile, assignments] = await Promise.all([
      ctx.db.get(member.barbershopId),
      ctx.db.get(member.userProfileDataId),
      ctx.db
        .query("barbershopMemberServices")
        .withIndex("by_barbershopMemberId", (q) =>
          q.eq("barbershopMemberId", args.id),
        )
        .collect(),
    ]);

    await Promise.all(
      assignments.map((assignment) => ctx.db.delete(assignment._id)),
    );

    // Cancel all active appointments for this barber (past and future)
    const activeAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.id),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "rescheduled"),
          ),
        ),
      )
      .collect();

    const barberName = barberProfile?.name ?? "el barbero";
    const barbershopName = barbershop?.name ?? "la barbería";

    for (const appt of activeAppointments) {
      await ctx.db.patch(appt._id, {
        deletedAt: Date.now(),
        status: "cancelled",
        notes: "Cita cancelada porque el barbero ya no pertenece a la barbería",
        proposedDate: undefined,
        rescheduleRequestedByUserId: undefined,
      });

      await ctx.runMutation(
        internal.notifications.createBarberRemovedCancellation,
        {
          appointmentId: appt._id,
          customerUserId: appt.userId,
          barberName,
          barbershopName,
          contactPhone: appt.contactPhone,
          contactEmail: appt.contactEmail,
        },
      );
    }

    await ctx.db.delete(args.id);
  },
});

export const getStaffByBarbershopId = zQuery({
  args: barbershops.tools.id.shape,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      return [];
    }

    const callerMember = await getByUserIdFn(ctx, { userId: user.userId });

    if (!callerMember || callerMember.barbershopId !== args.id) {
      return [];
    }

    const members = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const staffMembers = members.filter((member) =>
      member.roles.includes("staff"),
    );

    const staffWithName = await Promise.all(
      staffMembers.map(async (member) => {
        const memberProfile = await ctx.db.get(member.userProfileDataId);
        const betterAuthUser = await getBetterAuthUser(
          ctx,
          member.userProfileDataId,
        );

        return {
          ...member,
          name: memberProfile?.name ?? "",
          avatarUrl: betterAuthUser?.image ?? "",
        };
      }),
    );

    return staffWithName;
  },
});

export const removeStaffFromBarbershop = zMutation({
  args: barbershopMembers.tools.id,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "removeStaffFromBarbershop", user._id);

    const member = await ctx.db.get(args.id);

    if (!member) {
      return;
    }

    await assertCanManageShop(ctx, member.barbershopId, user.userId);

    if (!member.roles.includes("staff")) {
      throw new ConvexError("El miembro seleccionado no es recepcionista");
    }

    await ctx.db.delete(args.id);
  },
});

export const isStaff = zQuery({
  args: z.object({
    userId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId || !args.userId || user.userId !== args.userId) {
      return false;
    }

    const userProfile = await getProfileByUserId(ctx, args.userId);

    if (!userProfile) {
      return false;
    }

    const barbershopMember = await getByUserIdFn(ctx, { userId: args.userId });

    return barbershopMember?.roles.includes("staff") ?? false;
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

/**
 * Check if the user is an owner of any barbershop.
 * Returns true if the user has the "owner" role regardless of barber status.
 */
export const isOwner = zQuery({
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

    return barbershopMember?.roles.includes("owner") ?? false;
  },
});

/**
 * Check if the user is a member of any barbershop (any role).
 * Used to determine if the user should see the barbershop dashboard.
 */
export const isMember = zQuery({
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

    return barbershopMember?.isActive ?? false;
  },
});

/**
 * Toggle the "barber" role on the owner's membership record.
 *
 * - Adding barber role: simply appends "barber" to the roles array.
 * - Removing barber role: cancels all future appointments assigned to the owner,
 *   removes their service assignments, and strips "barber" from roles.
 *
 * Accepts an optional `reassignments` map to move future appointments to
 * another barber before removing the role.
 */
export const toggleBarberRole = zMutation({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
    addBarberRole: z.boolean(),
    reassignments: z
      .array(
        z.object({
          appointmentId: z.string(),
          targetBarbershopMemberId: z.string(),
        }),
      )
      .optional(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "toggleBarberRole", user._id);

    const member = await getByUserIdFn(ctx, {
      userId: user.userId,
    });

    if (!member) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    if (!member.roles.includes("owner")) {
      throw new ConvexError("Solo el dueño puede cambiar su rol de barbero");
    }

    if (member.barbershopId !== args.barbershopId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const isCurrentlyBarber = member.roles.includes("barber");

    if (args.addBarberRole) {
      if (isCurrentlyBarber) {
        return { status: "no-change" as const };
      }

      await ctx.db.patch(member._id, {
        roles: [...member.roles, "barber"],
      });

      return { status: "added" as const };
    }

    // Removing barber role
    if (!isCurrentlyBarber) {
      return { status: "no-change" as const };
    }

    const now = Date.now();

    // Find future appointments assigned to this owner-barber
    const futureAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", member._id),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.gte(q.field("date"), now),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "rescheduled"),
          ),
        ),
      )
      .collect();

    // If there are future appointments and no reassignments provided, return count for UI
    if (futureAppointments.length > 0 && !args.reassignments) {
      return {
        status: "needs-reassignment" as const,
        appointmentCount: futureAppointments.length,
        appointments: futureAppointments.map((a) => ({
          _id: a._id,
          customerName: a.customerName,
          date: a.date,
          serviceId: a.serviceId,
        })),
      };
    }

    // Process reassignments if provided
    if (args.reassignments && args.reassignments.length > 0) {
      for (const reassignment of args.reassignments) {
        const appointment = futureAppointments.find(
          (a) => String(a._id) === reassignment.appointmentId,
        );

        if (!appointment) continue;

        const targetMemberId =
          reassignment.targetBarbershopMemberId as Id<"barbershopMembers">;
        const targetMember = await ctx.db.get(targetMemberId);

        if (
          !targetMember ||
          !targetMember.isActive ||
          !targetMember.roles.includes("barber") ||
          targetMember.barbershopId !== member.barbershopId
        ) {
          throw new ConvexError(
            `El barbero seleccionado para la cita de ${appointment.customerName} no es válido`,
          );
        }
      }
    }

    // Cancel any future appointments that weren't reassigned
    const reassignmentIds = new Set(
      args.reassignments?.map((r) => r.appointmentId) ?? [],
    );
    const unreassignedAppointments = futureAppointments.filter(
      (a) => !reassignmentIds.has(String(a._id)),
    );

    for (const appt of unreassignedAppointments) {
      await ctx.db.patch(appt._id, {
        deletedAt: now,
        status: "cancelled",
        notes: "Cita cancelada porque el dueño dejó de atender como barbero.",
        proposedDate: undefined,
        rescheduleRequestedByUserId: undefined,
      });
    }

    // Remove service assignments
    const assignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", member._id),
      )
      .collect();

    await Promise.all(
      assignments.map((assignment) => ctx.db.delete(assignment._id)),
    );

    // Update roles
    await ctx.db.patch(member._id, {
      roles: member.roles.filter((r) => r !== "barber"),
    });

    return { status: "removed" as const };
  },
});

export const getByUserId = zQuery({
  args: z.object({
    userId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    if (!args.userId) {
      return null;
    }

    const userProfile = await getProfileByUserId(ctx, args.userId);

    if (!userProfile?._id) {
      return null;
    }

    const barbershopMember = await getByUserIdFn(ctx, { userId: args.userId });

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
        isStaff: false,
      };
    }

    const barbershopMember = await getByUserIdFn(ctx, { userId: args.userId });

    return {
      roles: barbershopMember?.roles,
      isOwner: barbershopMember?.roles.includes("owner"),
      isStaff: barbershopMember?.roles.includes("staff"),
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

// ---------------------------------------------------------------------------
// Barber schedule helpers
// ---------------------------------------------------------------------------

/**
 * Returns the effective working schedule for a barber.
 *
 * If the barber has a custom `availability` override → returns that.
 * Otherwise falls back to the parent barbershop's schedule.
 */
export async function getEffectiveSchedule(
  ctx: QueryCtx | MutationCtx,
  barbershopMemberId: Id<"barbershopMembers">,
): Promise<Barbershop["availability"]> {
  const member = await ctx.db.get(barbershopMemberId);

  if (!member) {
    throw new ConvexError(errorMessages.notFound("barbero"));
  }

  if (member.availability && member.availability.length > 0) {
    return member.availability;
  }

  const barbershop = await ctx.db.get(member.barbershopId);

  if (!barbershop) {
    throw new ConvexError(errorMessages.notFound("barbería"));
  }

  return barbershop.availability;
}

export const getBarberSchedule = zQuery({
  args: z.object({
    barbershopMemberId: barbershopMembers.tools.id.shape.id,
  }),
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.barbershopMemberId);

    if (!member) {
      return null;
    }

    const isCustom = !!(member.availability && member.availability.length > 0);
    const schedule = await getEffectiveSchedule(ctx, args.barbershopMemberId);

    return { schedule, isCustom };
  },
});

export const updateBarberSchedule = zMutation({
  args: z.object({
    barbershopMemberId: barbershopMembers.tools.id.shape.id,
    availability: barbershops.insertSchema.shape.availability,
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const member = await ctx.db.get(args.barbershopMemberId);

    if (!member) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    await assertShopRole(ctx, member.barbershopId, user.userId, [
      "owner",
      "staff",
    ]);
    await rateLimitOrThrow(ctx, "updateBarberSchedule", user._id);

    await ctx.db.patch(args.barbershopMemberId, {
      availability: args.availability,
    });
  },
});

export const resetBarberSchedule = zMutation({
  args: z.object({
    barbershopMemberId: barbershopMembers.tools.id.shape.id,
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const member = await ctx.db.get(args.barbershopMemberId);

    if (!member) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    await assertShopRole(ctx, member.barbershopId, user.userId, [
      "owner",
      "staff",
    ]);
    await rateLimitOrThrow(ctx, "updateBarberSchedule", user._id);

    await ctx.db.patch(args.barbershopMemberId, {
      availability: undefined,
    });
  },
});
