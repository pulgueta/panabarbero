/**
 * Subscription-based Access Control Layer (ACL).
 *
 * Complements `authz.ts` (role-based) with plan-based guards.
 * Every check here is server-authoritative — client UI gates are UX-only.
 */

import { ConvexError } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { usageTriggers } from "./aggregates";
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

  if (!sub || (sub.status !== "active" && sub.status !== "trialing")) {
    throw new ConvexError(errorMessages.subscriptionRequired);
  }
}

/**
 * Assert the barbershop's plan allows staff members to create appointments
 * on behalf of clients (pro / premium only).
 *
 * The check is always against the **owner's** subscription, since staff
 * members don't hold their own plan.
 */
export async function assertCanCreateStaffAppointment(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
): Promise<void> {
  const barbershop = await ctx.db.get(barbershopId);

  if (!barbershop) {
    throw new ConvexError(errorMessages.notFound("barbería"));
  }

  const limits = await getUserPlanLimits(ctx, barbershop.ownerId);

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

async function getUsageRow(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
  month: string,
) {
  return ctx.db
    .query("usage")
    .withIndex("by_barbershop_month", (q) =>
      q.eq("barbershopId", barbershopId).eq("month", month),
    )
    .unique();
}

/**
 * Returns `true` when the barbershop can still send SMS this month,
 * `false` when the monthly quota has been reached.
 * Never throws — safe to use in fire-and-forget notification paths.
 */
export async function isSmsLimitNotExceeded(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
): Promise<boolean> {
  const barbershop = await ctx.db.get(barbershopId);

  if (!barbershop) {
    return true;
  }

  const limits = await getUserPlanLimits(ctx, barbershop.ownerId);

  if (limits.maxSmsPerMonth === null) {
    return true;
  }

  const row = await getUsageRow(ctx, barbershopId, getCurrentYearMonth());

  if (!row) {
    return true;
  }

  return row.smsSent < limits.maxSmsPerMonth;
}

/**
 * Returns `true` when the barbershop can still send emails this month,
 * `false` when the monthly quota has been reached.
 * Never throws — safe to use in fire-and-forget notification paths.
 */
export async function isEmailLimitNotExceeded(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
): Promise<boolean> {
  const barbershop = await ctx.db.get(barbershopId);

  if (!barbershop) {
    return true;
  }

  const limits = await getUserPlanLimits(ctx, barbershop.ownerId);

  if (limits.maxEmailPerMonth === null) {
    return true;
  }

  const row = await getUsageRow(ctx, barbershopId, getCurrentYearMonth());

  if (!row) {
    return true;
  }

  return row.emailsSent < limits.maxEmailPerMonth;
}

/**
 * Increment the SMS counter for a barbershop in the current month.
 * Creates the `usage` row if it doesn't exist yet (upsert pattern).
 *
 * Writes go through `usageTriggers.wrapDB` so that `smsUsageAggregate` and
 * `emailUsageAggregate` are updated automatically — no manual sync needed.
 */
export async function incrementSmsSent(
  ctx: MutationCtx,
  barbershopId: Id<"barbershops">,
): Promise<void> {
  const month = getCurrentYearMonth();
  const existing = await getUsageRow(ctx, barbershopId, month);
  const db = usageTriggers.wrapDB(ctx).db;

  if (existing) {
    await db.patch(existing._id, { smsSent: existing.smsSent + 1 });
  } else {
    await db.insert("usage", {
      barbershopId,
      month,
      smsSent: 1,
      emailsSent: 0,
    });
  }
}

/**
 * Increment the email counter for a barbershop in the current month.
 * Creates the `usage` row if it doesn't exist yet (upsert pattern).
 *
 * Writes go through `usageTriggers.wrapDB` so that `emailUsageAggregate` is
 * updated automatically — no manual sync needed.
 */
export async function incrementEmailSent(
  ctx: MutationCtx,
  barbershopId: Id<"barbershops">,
): Promise<void> {
  const month = getCurrentYearMonth();
  const existing = await getUsageRow(ctx, barbershopId, month);
  const db = usageTriggers.wrapDB(ctx).db;

  if (existing) {
    await db.patch(existing._id, { emailsSent: existing.emailsSent + 1 });
  } else {
    await db.insert("usage", {
      barbershopId,
      month,
      smsSent: 0,
      emailsSent: 1,
    });
  }
}
