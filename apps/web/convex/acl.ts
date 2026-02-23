/**
 * Subscription-based Access Control Layer (ACL).
 *
 * Complements `authz.ts` (role-based) with plan-based guards.
 * Every check here is server-authoritative — client UI gates are UX-only.
 */

import { ConvexError } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { errorMessages } from "./errors";
import {
  getCurrentYearMonth,
  getLimitsForProductKey,
  getTierForProductKey,
  type PlanLimits,
  type PlanTier,
} from "./plans";
import { polar } from "./polar";

/**
 * Fetch the active Polar subscription for a given `userId`.
 * Returns `null` when the user has no active subscription.
 */
async function getSubscription(ctx: QueryCtx | MutationCtx, userId: string) {
  return polar.getCurrentSubscription(ctx, { userId });
}

/**
 * Resolve the plan tier for a user.
 * Defaults to `"free"` when no active subscription exists.
 */
export async function getUserPlanTier(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<PlanTier> {
  const sub = await getSubscription(ctx, userId);
  return getTierForProductKey(sub?.productKey);
}

/**
 * Resolve the plan limits for a user.
 * Defaults to free-tier limits when no active subscription exists.
 */
export async function getUserPlanLimits(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<PlanLimits> {
  const sub = await getSubscription(ctx, userId);
  return getLimitsForProductKey(sub?.productKey);
}

/**
 * Assert the user has **any** active subscription (including the free plan).
 * Use to gate features that require at least subscribing to the free plan.
 */
export async function assertIsSubscribed(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<void> {
  const sub = await getSubscription(ctx, userId);

  if (!sub || sub.status !== "active") {
    throw new ConvexError(errorMessages.subscriptionRequired);
  }
}

/**
 * Assert the user's plan allows staff members to create appointments
 * on behalf of clients (pro / premium only).
 */
export async function assertCanCreateStaffAppointment(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<void> {
  const limits = await getUserPlanLimits(ctx, userId);

  if (!limits.staffCanCreateAppointments) {
    throw new ConvexError(
      errorMessages.planLimitExceeded("crear citas por tus clientes"),
    );
  }
}

/**
 * Assert the barbershop owner can invite another barber without exceeding the
 * plan limit.
 *
 * The count only includes **invited** barbers (members with the `"barber"` role
 * that do NOT also hold the `"owner"` role).
 */
export async function assertBarberInviteAllowed(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  ownerUserId: string,
): Promise<void> {
  const limits = await getUserPlanLimits(ctx, ownerUserId);

  if (limits.maxInvitedBarbers === 0) {
    throw new ConvexError(errorMessages.barberLimitExceeded);
  }

  // `null` means unlimited — skip the count
  if (limits.maxInvitedBarbers === null) {
    return;
  }

  const members = await ctx.db
    .query("barbershopMembers")
    .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
    .collect();

  const invitedBarberCount = members.filter(
    (m) =>
      m.isActive && m.roles.includes("barber") && !m.roles.includes("owner"),
  ).length;

  if (invitedBarberCount >= limits.maxInvitedBarbers) {
    throw new ConvexError(errorMessages.barberLimitExceeded);
  }
}

// ---------------------------------------------------------------------------
// SMS quota helpers
// ---------------------------------------------------------------------------

/**
 * Assert a barbershop can still send SMS this month.
 *
 * Resolves the owner's plan to determine the monthly limit and checks the
 * `smsUsage` counter for the current `YYYY-MM`.
 */
export async function assertSmsLimitNotExceeded(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
): Promise<void> {
  const barbershop = await ctx.db.get(barbershopId);

  if (!barbershop) {
    // Barbershop deleted — silently bail; nothing to enforce.
    return;
  }

  const limits = await getUserPlanLimits(ctx, barbershop.ownerId);

  // `null` means unlimited
  if (limits.maxSmsPerMonth === null) {
    return;
  }

  const month = getCurrentYearMonth();

  const usage = await ctx.db
    .query("smsUsage")
    .withIndex("by_barbershop_month", (q) =>
      q.eq("barbershopId", barbershopId).eq("month", month),
    )
    .unique();

  if ((usage?.smsSent ?? 0) >= limits.maxSmsPerMonth) {
    throw new ConvexError(errorMessages.smsLimitExceeded);
  }
}

/**
 * Increment the SMS counter for a barbershop in the current month.
 * Creates the `smsUsage` row if it doesn't exist yet (upsert pattern).
 *
 * Must be called from a mutation context (needs write access).
 */
export async function incrementSmsSent(
  ctx: MutationCtx,
  barbershopId: Id<"barbershops">,
): Promise<void> {
  const month = getCurrentYearMonth();

  const existing = await ctx.db
    .query("smsUsage")
    .withIndex("by_barbershop_month", (q) =>
      q.eq("barbershopId", barbershopId).eq("month", month),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, { smsSent: existing.smsSent + 1 });
  } else {
    await ctx.db.insert("smsUsage", {
      barbershopId,
      month,
      smsSent: 1,
    });
  }
}
