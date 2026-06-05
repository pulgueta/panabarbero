import { z } from "zod";

import { zInternalQuery } from ".";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getByUserIdFn } from "./barbershopMembers";
import { getLimitsForProductKey } from "./plans";
import { polar } from "./polar";
import { barbershops } from "./schema";
import { getProfileByUserId } from "./userProfileData";

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
 * instead of relying on `safeGetAuthUser`, since the agent runs inside a
 * scheduled action that does not carry the caller's auth context.
 */
export const getNotificationsByUserId = zInternalQuery({
  args: z.object({
    userId: z.string(),
    numItems: z.number(),
    onlyUnread: z.boolean(),
  }),
  handler: async (ctx, args) => {
    if (args.onlyUnread) {
      return await ctx.db
        .query("inAppNotifications")
        .withIndex("by_user_unread", (q) =>
          q.eq("userId", args.userId).eq("readAt", undefined),
        )
        .order("desc")
        .take(args.numItems);
    }

    return await ctx.db
      .query("inAppNotifications")
      .withIndex("by_user_created", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.numItems);
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
