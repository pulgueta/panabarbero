/** biome-ignore-all lint/style/noNonNullAssertion: false positive */

import { ConvexError } from "convex/values";
import { z } from "zod";

import { zAuthMutation, zInternalMutation, zQuery } from ".";
import { internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  assertCanManageShop,
  assertShopRole,
  authz,
  barbershopScope,
  getMemberWorkosUserId,
  revokeMemberAuthz,
  syncMemberAuthz,
} from "./authz";
import { errorMessages } from "./errors";
import { getUserId, requireUserId } from "./identity";
import { releaseForAppointment } from "./inventory";
import { rateLimitOrThrow } from "./ratelimit";
import type { Barbershop, BarbershopMember } from "./schema";
import { barbershopMembers, barbershops } from "./schema";
import { getProfileByUserId } from "./userProfileData";
import { parseTimeToMinutes } from "./utils";

export const create = zInternalMutation({
  args: barbershopMembers.tools.insert,
  handler: async (ctx, args) => {
    await requireUserId(ctx);

    const barbershopMemberId = await ctx.db.insert("barbershopMembers", args);

    // Mirror the new membership into the authz component.
    const profile = await ctx.db.get(args.userProfileDataId);

    if (profile?.userId && args.isActive) {
      await syncMemberAuthz(ctx, {
        userId: profile.userId,
        barbershopId: args.barbershopId,
        previousRoles: [],
        nextRoles: args.roles,
      });
    }

    return barbershopMemberId;
  },
});

export const getByBarbershopId = zQuery({
  args: barbershops.tools.id.shape,
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
          avatarUrl: memberProfile?.image ?? "",
        };
      }),
    );

    return membersWithName.filter((member) => member.roles.includes("barber"));
  },
});

export const update = zAuthMutation({
  args: barbershopMembers.tools.update,
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "updateBarbershopMember", userId);

    const existing = await ctx.db.get(args.id);

    const updatedBarbershopMember = await ctx.db.patch(args.id, args.data);

    // Mirror role/activation changes into the authz component.
    if (
      existing &&
      (args.data.roles !== undefined || args.data.isActive !== undefined)
    ) {
      const workosUserId = await getMemberWorkosUserId(ctx, existing);

      if (workosUserId) {
        const nextRoles = args.data.roles ?? existing.roles;
        const nextActive = args.data.isActive ?? existing.isActive;

        await syncMemberAuthz(ctx, {
          userId: workosUserId,
          barbershopId: existing.barbershopId,
          previousRoles: existing.isActive ? existing.roles : [],
          nextRoles: nextActive ? nextRoles : [],
        });
      }
    }

    return updatedBarbershopMember;
  },
});

export const deleteMember = zInternalMutation({
  args: barbershopMembers.tools.id,
  handler: async (ctx, args) => {
    await requireUserId(ctx);

    const member = await ctx.db.get(args.id);

    await ctx.db.delete(args.id);

    if (member) {
      const workosUserId = await getMemberWorkosUserId(ctx, member);

      if (workosUserId) {
        await revokeMemberAuthz(ctx, {
          userId: workosUserId,
          barbershopId: member.barbershopId,
        });
      }
    }
  },
});

export const removeBarberFromBarbershop = zAuthMutation({
  args: z.object({
    ...barbershopMembers.tools.id.shape,
    force: z.boolean().optional(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "removeBarberFromBarbershop", userId);

    const member = await ctx.db.get(args.id);

    if (!member) {
      return;
    }

    await assertCanManageShop(ctx, member.barbershopId, userId);

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

    // Cancel all active appointments for this barber (past and future)
    const [, activeAppointments] = await Promise.all([
      Promise.all(
        assignments.map((assignment) => ctx.db.delete(assignment._id)),
      ),
      ctx.db
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
        .collect(),
    ]);

    const barberName = barberProfile?.name ?? "el barbero";
    const barbershopName = barbershop?.name ?? "la barbería";

    for (const appt of activeAppointments) {
      await releaseForAppointment(
        ctx,
        appt,
        "Cita cancelada porque el barbero ya no pertenece a la barbería",
      );
      await ctx.db.patch(appt._id, {
        deletedAt: Date.now(),
        status: "cancelled",
        notes: "Cita cancelada porque el barbero ya no pertenece a la barbería",
        proposedDate: undefined,
        rescheduleRequestedByUserId: undefined,
      });
    }

    await Promise.all([
      ...activeAppointments.map((appt) =>
        ctx.runMutation(
          internal.notifications.createBarberRemovedCancellation,
          {
            appointmentId: appt._id,
            customerUserId: appt.userId,
            barberName,
            barbershopName,
            contactPhone: appt.contactPhone,
            contactEmail: appt.contactEmail,
          },
        ),
      ),
      ctx.db.delete(args.id),
    ]);

    if (barberProfile?.userId) {
      await revokeMemberAuthz(ctx, {
        userId: barberProfile.userId,
        barbershopId: member.barbershopId,
      });
    }

    if (barbershop?.workosOrganizationId && barberProfile?.userId) {
      await ctx.scheduler.runAfter(
        0,
        internal.workosOrgs.removeOrganizationMembership,
        {
          workosOrganizationId: barbershop.workosOrganizationId,
          userId: barberProfile.userId,
        },
      );
    }
  },
});

export const getStaffByBarbershopId = zQuery({
  args: barbershops.tools.id.shape,
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    if (!userId) {
      return [];
    }

    const callerMember = await getByUserIdFn(ctx, { userId });

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

        return {
          ...member,
          name: memberProfile?.name ?? "",
          avatarUrl: memberProfile?.image ?? "",
        };
      }),
    );

    return staffWithName;
  },
});

export const removeStaffFromBarbershop = zAuthMutation({
  args: barbershopMembers.tools.id,
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "removeStaffFromBarbershop", userId);

    const member = await ctx.db.get(args.id);

    if (!member) {
      return;
    }

    await assertCanManageShop(ctx, member.barbershopId, userId);

    if (!member.roles.includes("staff")) {
      throw new ConvexError("El miembro seleccionado no es recepcionista");
    }

    const [barbershop, staffProfile] = await Promise.all([
      ctx.db.get(member.barbershopId),
      ctx.db.get(member.userProfileDataId),
    ]);

    await ctx.db.delete(args.id);

    if (staffProfile?.userId) {
      await revokeMemberAuthz(ctx, {
        userId: staffProfile.userId,
        barbershopId: member.barbershopId,
      });
    }

    if (barbershop?.workosOrganizationId && staffProfile?.userId) {
      await ctx.scheduler.runAfter(
        0,
        internal.workosOrgs.removeOrganizationMembership,
        {
          workosOrganizationId: barbershop.workosOrganizationId,
          userId: staffProfile.userId,
        },
      );
    }
  },
});

export const isStaff = zQuery({
  args: z.object({
    userId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    if (!userId || !args.userId || userId !== args.userId) {
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
    const userId = await getUserId(ctx);

    if (!userId || !args.userId || userId !== args.userId) {
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
    const userId = await getUserId(ctx);

    if (!userId || !args.userId || userId !== args.userId) {
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
    const userId = await getUserId(ctx);

    if (!userId || !args.userId || userId !== args.userId) {
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
export const toggleBarberRole = zAuthMutation({
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
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "toggleBarberRole", userId);

    const member = await getByUserIdFn(ctx, {
      userId,
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

      await authz.assignRole(
        ctx,
        userId,
        "barber",
        barbershopScope(member.barbershopId),
      );

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
      const targetMembers = await Promise.all(
        args.reassignments.map((reassignment) => {
          const targetMemberId =
            reassignment.targetBarbershopMemberId as BarbershopMember["_id"];
          return ctx.db.get(targetMemberId);
        }),
      );

      const appointmentMap = new Map(
        futureAppointments.map((a) => [String(a._id), a]),
      );

      for (let i = 0; i < args.reassignments.length; i++) {
        const reassignment = args.reassignments[i];
        const appointment = appointmentMap.get(reassignment.appointmentId);

        if (!appointment) continue;

        const targetMember = targetMembers[i];

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

    // Remove service assignments
    for (const appt of unreassignedAppointments) {
      await releaseForAppointment(
        ctx,
        appt,
        "Cita cancelada porque el dueño dejó de atender como barbero.",
      );
      await ctx.db.patch(appt._id, {
        deletedAt: now,
        status: "cancelled",
        notes: "Cita cancelada porque el dueño dejó de atender como barbero.",
        proposedDate: undefined,
        rescheduleRequestedByUserId: undefined,
      });
    }

    const assignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", member._id),
      )
      .collect();

    await Promise.all([
      ...assignments.map((assignment) => ctx.db.delete(assignment._id)),
      ctx.db.patch(member._id, {
        roles: member.roles.filter((r) => r !== "barber"),
      }),
    ]);

    await authz.revokeRole(
      ctx,
      userId,
      "barber",
      barbershopScope(member.barbershopId),
    );

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
    .first();
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
  barbershopMemberId: BarbershopMember["_id"],
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

export const updateBarberSchedule = zAuthMutation({
  args: z.object({
    barbershopMemberId: barbershopMembers.tools.id.shape.id,
    availability: barbershops.insertSchema.shape.availability,
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    const member = await ctx.db.get(args.barbershopMemberId);

    if (!member) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    const callerMember = await assertShopRole(
      ctx,
      member.barbershopId,
      userId,
      ["owner", "staff"],
    );
    await rateLimitOrThrow(ctx, "updateBarberSchedule", userId);

    // Staff may only edit their own schedule; owners can edit any barber's schedule
    const isOwner = callerMember.roles.includes("owner");
    if (!isOwner && callerMember._id !== args.barbershopMemberId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    // Validate time strings and logical ordering before persisting.
    // Only active days carry meaningful openAt/closeAt values — inactive days
    // are sent with empty strings from the client and must be skipped.
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

    for (const day of args.availability) {
      if (!day.weekDay.isActive) continue;

      if (!timeRegex.test(day.openAt) || !timeRegex.test(day.closeAt)) {
        throw new ConvexError("Formato de hora inválido, usa HH:mm");
      }

      const openMin = parseTimeToMinutes(day.openAt);
      const closeMin = parseTimeToMinutes(day.closeAt);

      if (openMin >= closeMin) {
        throw new ConvexError(
          "La hora de apertura debe ser anterior a la hora de cierre",
        );
      }

      if (day.lunchStart || day.lunchEnd) {
        if (!day.lunchStart || !day.lunchEnd) {
          throw new ConvexError(
            "Debes especificar tanto el inicio como el fin del horario de no disponibilidad",
          );
        }

        if (!timeRegex.test(day.lunchStart) || !timeRegex.test(day.lunchEnd)) {
          throw new ConvexError(
            "Formato de hora de no disponibilidad inválido, usa HH:mm",
          );
        }

        const lunchStartMin = parseTimeToMinutes(day.lunchStart);
        const lunchEndMin = parseTimeToMinutes(day.lunchEnd);

        if (lunchStartMin >= lunchEndMin) {
          throw new ConvexError(
            "El inicio del horario de no disponibilidad debe ser anterior al fin del horario de no disponibilidad",
          );
        }

        if (lunchStartMin < openMin || lunchEndMin > closeMin) {
          throw new ConvexError(
            "El horario de no disponibilidad debe estar dentro del horario de apertura",
          );
        }
      }
    }

    await ctx.db.patch(args.barbershopMemberId, {
      availability: args.availability,
    });
  },
});

export const resetBarberSchedule = zAuthMutation({
  args: z.object({
    barbershopMemberId: barbershopMembers.tools.id.shape.id,
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    const member = await ctx.db.get(args.barbershopMemberId);

    if (!member) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    const callerMember = await assertShopRole(
      ctx,
      member.barbershopId,
      userId,
      ["owner", "staff"],
    );
    await rateLimitOrThrow(ctx, "updateBarberSchedule", userId);

    // Staff may only reset their own schedule; owners can reset any barber's schedule
    const isOwner = callerMember.roles.includes("owner");
    if (!isOwner && callerMember._id !== args.barbershopMemberId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await ctx.db.patch(args.barbershopMemberId, {
      availability: undefined,
    });
  },
});
