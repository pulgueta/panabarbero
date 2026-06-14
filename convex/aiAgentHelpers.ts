import { ConvexError } from "convex/values";
import { z } from "zod";

import { zInternalQuery } from ".";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getBarbershopMemberByUserId, memberHasAnyRole } from "./authz";
import { getByUserIdFn, getEffectiveSchedule } from "./barbershopMembers";
import { errorMessages } from "./errors";
import { unreads } from "./notifications";
import { getLimitsForProductKey } from "./plans";
import { polar } from "./polar";
import { barbershops } from "./schema";
import { getProfileByUserId } from "./userProfileData";

const ACTIVE_APPOINTMENT_STATUSES: Doc<"appointments">["status"][] = [
  "pending",
  "confirmed",
  "rescheduled",
];

export const getAppointmentsByUserId = zInternalQuery({
  args: z.object({
    userId: z.string(),
    numItems: z.number(),
  }),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.numItems);
  },
});

export const getBarbershop = zInternalQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getReviewsForBarbershop = zInternalQuery({
  args: z.object({
    barbershopId: z.string(),
    limit: z.number(),
  }),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reviews")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId as Id<"barbershops">),
      )
      .order("desc")
      .take(args.limit);
  },
});

/**
 * In-app notifications for a given user, used by the `getMyNotifications`
 * agent tool. Takes an explicit `userId` (the agent's resolved caller id)
 * instead of reading `ctx.auth`, since the agent runs inside a scheduled
 * action that does not carry the caller's auth context. Returns the read
 * watermark so the tool can derive per-row `isRead`.
 */
export const getNotificationsByUserId = zInternalQuery({
  args: z.object({
    userId: z.string(),
    numItems: z.number(),
    onlyUnread: z.boolean(),
  }),
  handler: async (ctx, args) => {
    const lastRead = await unreads.getLastRead(ctx, {
      userId: args.userId,
      channelId: args.userId,
    });

    const notifications = args.onlyUnread
      ? await ctx.db
          .query("inAppNotifications")
          .withIndex("by_user_created", (q) =>
            q.eq("userId", args.userId).gt("_creationTime", lastRead ?? 0),
          )
          .order("desc")
          .take(args.numItems)
      : await ctx.db
          .query("inAppNotifications")
          .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
          .order("desc")
          .take(args.numItems);

    return { notifications, lastRead };
  },
});

/**
 * Converts a stored phone number (E.164, e.g. `+573001234567`) to the
 * 10-digit national form the booking tools expect. Returns `undefined`
 * for values that aren't a recognizable Colombian mobile number.
 */
function toNationalPhoneNumber(stored: string | undefined): string | undefined {
  if (!stored) return undefined;

  const digits = stored.replace(/\D/g, "");

  if (digits.startsWith("57") && digits.length === 12) {
    return digits.slice(2);
  }

  if (digits.length === 10) {
    return digits;
  }

  return undefined;
}

/**
 * Profile lookup for the AI agent. Takes an explicit `userId` and skips the
 * `safeGetAuthUser` gate in `userProfileData.getMyProfile` — the agent runs
 * inside a scheduled action with no caller auth context, so that gated query
 * always returns `null`. The phone is normalized to 10 digits so the booking
 * tools can use it directly.
 */
export const getProfileForUserId = zInternalQuery({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) => {
    const profile = await getProfileByUserId(ctx, args.userId);

    if (!profile) {
      return null;
    }

    return {
      name: profile.name,
      email: profile.email,
      phoneNumber: toNationalPhoneNumber(profile.phoneNumber),
    };
  },
});

/**
 * Resolves the barbershop member record for a user. Used by the AI tools to
 * determine whether the caller is a barber/owner and to get their memberId
 * for schedule lookups.
 */
export const getMemberForUserId = zInternalQuery({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) => {
    const member = await getByUserIdFn(ctx, { userId: args.userId });
    if (!member) return null;

    const barbershop = await ctx.db.get(member.barbershopId);
    return {
      memberId: member._id as string,
      barbershopId: member.barbershopId as string,
      barbershopName: barbershop?.name ?? "",
      roles: member.roles,
    };
  },
});

/**
 * Appointments where the user is the attending barber (work schedule view).
 * Queries by the `by_barbershopMemberId` index, distinct from
 * `getAppointmentsByUserId` which queries the customer-side `by_userId` index.
 */
export const getAppointmentsByMemberId = zInternalQuery({
  args: z.object({
    barbershopMemberId: z.string(),
    numItems: z.number(),
  }),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq(
          "barbershopMemberId",
          args.barbershopMemberId as Id<"barbershopMembers">,
        ),
      )
      .order("desc")
      .take(args.numItems);
  },
});

/**
 * Barbershop members lookup for the AI agent. Bypasses `safeGetAuthUser`
 * because the agent runs inside a scheduled action with no caller auth context.
 * The public `barbershopMembers.getByBarbershopId` returns `[]` in that case.
 */
export const getMembersByBarbershopId = zInternalQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const barbers = members.filter((m) => m.roles.includes("barber"));

    return await Promise.all(
      barbers.map(async (member) => {
        const memberProfile = await ctx.db.get(member.userProfileDataId);
        return { ...member, name: memberProfile?.name ?? "" };
      }),
    );
  },
});

/**
 * Resolve whether a user can manage their barbershop through Pana.
 *
 * A member's access is always derived from the **barbershop owner's** plan,
 * since barbers/staff don't hold their own subscription. Non-members (regular
 * customers, anonymous users) are not gated — they use Pana freely for booking.
 *
 * Shared by the AI system-prompt soft gate (`getPanaEntitlement`) and the
 * client-facing UI gate (`aiChat.getPanaAccess`) so both stay consistent.
 */
export async function resolvePanaAccessForUserId(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<{ isShopMember: boolean; canManage: boolean; isOwner: boolean }> {
  const member = await getByUserIdFn(ctx, { userId });

  if (!member?.roles || member.roles.length === 0) {
    return { isShopMember: false, canManage: true, isOwner: false };
  }

  const barbershop = await ctx.db.get(member.barbershopId);
  const subscription = barbershop
    ? await polar.getCurrentSubscription(ctx, { userId: barbershop.ownerId })
    : null;
  const limits = getLimitsForProductKey(subscription?.productKey);

  return {
    isShopMember: true,
    canManage: limits.panaManagement,
    isOwner: member.roles.includes("owner"),
  };
}

/**
 * Pana management entitlement for the AI agent. Determines whether the caller
 * is a barbershop member and whether their plan unlocks managing the shop via
 * chat, so the dynamic system prompt can softly gate management requests.
 */
export const getPanaEntitlement = zInternalQuery({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) => {
    const { isShopMember, canManage } = await resolvePanaAccessForUserId(
      ctx,
      args.userId,
    );

    return { isShopMember, canManage };
  },
});

/**
 * Lightweight management context for the AI agent's *propose* tools (which run
 * in a no-auth scheduled action and only carry the resolved callerId). Returns
 * the caller's membership, roles and the plan flags that gate management
 * actions, so a propose tool can soft-reject before drawing a confirmation card.
 * The authoritative gate is always the mutation called at confirm time.
 */
export const getAgentActorContext = zInternalQuery({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) => {
    const member = await getByUserIdFn(ctx, { userId: args.userId });

    if (!member) return { isMember: false as const };

    const barbershop = await ctx.db.get(member.barbershopId);
    const subscription = barbershop
      ? await polar.getCurrentSubscription(ctx, { userId: barbershop.ownerId })
      : null;
    const limits = getLimitsForProductKey(subscription?.productKey);

    return {
      isMember: true as const,
      memberId: member._id as string,
      barbershopId: member.barbershopId as string,
      barbershopName: barbershop?.name ?? "",
      roles: member.roles,
      isOwner: member.roles.includes("owner"),
      canManageTeam:
        member.roles.includes("owner") || member.roles.includes("staff"),
      panaManagement: limits.panaManagement,
      staffAppointmentsAllowed: limits.staffCanCreateAppointments,
    };
  },
});

/**
 * One-shot barbershop context for the `getMyBarbershop` tool. Returns the
 * caller's own shop — id, services (+ids), active barbers (+memberIds), weekly
 * hours, the caller's memberId and roles — so a team member never re-discovers
 * a shop they already belong to with searchBarbershops → getBarbershopDetails →
 * listBarbersForService.
 */
export const getMyBarbershopData = zInternalQuery({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) => {
    const member = await getByUserIdFn(ctx, { userId: args.userId });

    if (!member) return { isMember: false as const };

    const barbershop = await ctx.db.get(member.barbershopId);

    if (!barbershop) return { isMember: false as const };

    const [services, members, subscription] = await Promise.all([
      ctx.db
        .query("services")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", barbershop._id),
        )
        .collect(),
      ctx.db
        .query("barbershopMembers")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", barbershop._id),
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect(),
      polar.getCurrentSubscription(ctx, { userId: barbershop.ownerId }),
    ]);

    const limits = getLimitsForProductKey(subscription?.productKey);

    const barbers = await Promise.all(
      members
        .filter((m) => m.roles.includes("barber"))
        .map(async (m) => {
          const profile = await ctx.db.get(m.userProfileDataId);
          return {
            barbershopMemberId: m._id as string,
            name: profile?.name ?? "",
            isOwner: m.roles.includes("owner"),
          };
        }),
    );

    return {
      isMember: true as const,
      barbershopId: barbershop._id as string,
      name: barbershop.name,
      city: barbershop.city,
      myMemberId: member._id as string,
      roles: member.roles,
      canManage: limits.panaManagement,
      staffAppointmentsAllowed: limits.staffCanCreateAppointments,
      availability: barbershop.availability.map((a) => ({
        day: a.weekDay.day,
        isOpen: a.weekDay.isActive,
        openAt: a.openAt,
        closeAt: a.closeAt,
      })),
      services: services.map((s) => ({
        serviceId: s._id as string,
        name: s.name,
        price: s.price,
        durationMinutes: s.duration,
      })),
      barbers,
    };
  },
});

/**
 * Effective weekly schedule for a barber, for the `getBarberSchedule` tool and
 * the schedule-edit flow. Returns the barber's own override if any, otherwise
 * the shop's hours, plus whether it's a custom override.
 */
export const getBarberScheduleData = zInternalQuery({
  args: z.object({ barbershopMemberId: z.string() }),
  handler: async (ctx, args) => {
    const memberId = args.barbershopMemberId as Id<"barbershopMembers">;
    const member = await ctx.db.get(memberId);

    if (!member) return { found: false as const };

    const schedule = await getEffectiveSchedule(ctx, memberId);
    const profile = await ctx.db.get(member.userProfileDataId);

    return {
      found: true as const,
      barberName: profile?.name ?? "",
      isCustom: !!(member.availability && member.availability.length > 0),
      schedule,
    };
  },
});

/**
 * Confirm-time authorization gate for appointment write actions. The args of
 * `confirmPendingAction` are client-controlled, so the propose-time check is
 * only UX — this re-verifies, with the server-resolved callerId, that the
 * caller may act on the appointment as the customer ("customer"), as a shop
 * member ("shop"), or either ("any"). Throws `ConvexError` otherwise.
 */
export const assertAppointmentActor = zInternalQuery({
  args: z.object({
    userId: z.string(),
    appointmentId: z.string(),
    requiredActor: z.enum(["customer", "shop", "any"]),
  }),
  handler: async (ctx, args) => {
    const appt = await ctx.db.get(args.appointmentId as Id<"appointments">);

    if (!appt || appt.deletedAt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    const isCustomer = appt.userId === args.userId;

    let isShop = false;
    const member = await getBarbershopMemberByUserId(
      ctx,
      appt.barbershopId,
      args.userId,
    );
    isShop =
      !!member &&
      member.isActive &&
      memberHasAnyRole(member, ["owner", "barber", "staff"]);

    const allowed =
      args.requiredActor === "customer"
        ? isCustomer
        : args.requiredActor === "shop"
          ? isShop
          : isCustomer || isShop;

    if (!allowed) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    return { ok: true as const };
  },
});

/**
 * Count of future, still-active appointments that a destructive management
 * action would cancel. Lets a propose tool warn the user ("esto cancela N
 * citas") inside the confirmation card before they approve.
 */
export const countImpactedByService = zInternalQuery({
  args: z.object({ serviceId: z.string() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const impacted = await ctx.db
      .query("appointments")
      .withIndex("by_serviceId", (q) =>
        q.eq("serviceId", args.serviceId as Id<"services">),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.gte(q.field("date"), now),
        ),
      )
      .collect();

    return impacted.filter((a) =>
      ACTIVE_APPOINTMENT_STATUSES.includes(a.status),
    ).length;
  },
});

export const countImpactedByMember = zInternalQuery({
  args: z.object({ barbershopMemberId: z.string() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const impacted = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq(
          "barbershopMemberId",
          args.barbershopMemberId as Id<"barbershopMembers">,
        ),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.gte(q.field("date"), now),
        ),
      )
      .collect();

    return impacted.filter((a) =>
      ACTIVE_APPOINTMENT_STATUSES.includes(a.status),
    ).length;
  },
});
