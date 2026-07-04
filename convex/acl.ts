/**
 * Subscription-based Access Control Layer (ACL).
 *
 * Complements `authz.ts` (role-based) with plan-based guards.
 * Every check here is server-authoritative — client UI gates are UX-only.
 */

import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { usageTriggers } from "./aggregates";
import { getExtraCredits } from "./credits";
import { errorMessages } from "./errors";
import {
  getCurrentYearMonth,
  getLimitsForProductKey,
  getTierForProductKey,
  type PlanLimits,
  type PlanTier,
} from "./plans";
import { polar } from "./polar";
import type { Barbershop } from "./schema";

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
  barbershopId: Barbershop["_id"],
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
 * Assert the barbershop's plan includes the inventory module (pro / premium).
 * Always resolved against the **owner's** subscription — staff/barbers hold
 * no plan of their own.
 */
export async function assertInventoryAllowed(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Barbershop["_id"],
): Promise<void> {
  const barbershop = await ctx.db.get(barbershopId);

  if (!barbershop) {
    throw new ConvexError(errorMessages.notFound("barbería"));
  }

  const limits = await getUserPlanLimits(ctx, barbershop.ownerId);

  if (!limits.inventoryEnabled) {
    throw new ConvexError(errorMessages.planLimitExceeded("inventario"));
  }
}

/**
 * Non-throwing variant of {@link assertInventoryAllowed} for the appointment
 * lifecycle hooks, which must never fail a booking over inventory gating.
 */
export async function isInventoryAllowed(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Barbershop["_id"],
): Promise<boolean> {
  const barbershop = await ctx.db.get(barbershopId);

  if (!barbershop) {
    return false;
  }

  const limits = await getUserPlanLimits(ctx, barbershop.ownerId);

  return limits.inventoryEnabled;
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
  barbershopId: Barbershop["_id"],
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

/**
 * Assert the barbershop owner can invite a staff member without exceeding the
 * plan limit.
 *
 * The count only includes members with the `"staff"` role
 * that do NOT also hold the `"owner"` role.
 */
export async function assertStaffInviteAllowed(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Barbershop["_id"],
  ownerUserId: string,
): Promise<void> {
  const limits = await getUserPlanLimits(ctx, ownerUserId);

  if (limits.maxStaff === 0) {
    throw new ConvexError(errorMessages.staffLimitExceeded);
  }

  // `null` means unlimited — skip the count
  if (limits.maxStaff === null) {
    return;
  }

  const members = await ctx.db
    .query("barbershopMembers")
    .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
    .collect();

  const staffCount = members.filter(
    (m) =>
      m.isActive && m.roles.includes("staff") && !m.roles.includes("owner"),
  ).length;

  if (staffCount >= limits.maxStaff) {
    throw new ConvexError(errorMessages.staffLimitExceeded);
  }
}

export async function getUsageRow(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Barbershop["_id"],
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
 * `false` when both the monthly plan quota AND purchased extra credits
 * are exhausted.
 * Never throws — safe to use in fire-and-forget notification paths.
 */
export async function isSmsLimitNotExceeded(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Barbershop["_id"],
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

  // Plan quota still has room
  if (row.smsSent < limits.maxSmsPerMonth) {
    return true;
  }

  // Plan exhausted — check purchased extra credits
  const credits = await getExtraCredits(ctx, barbershopId);

  return (credits?.smsCredits ?? 0) > 0;
}

/**
 * Returns `true` when the barbershop can still send emails this month,
 * `false` when both the monthly plan quota AND purchased extra credits
 * are exhausted.
 * Never throws — safe to use in fire-and-forget notification paths.
 */
export async function isEmailLimitNotExceeded(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Barbershop["_id"],
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

  // Plan quota still has room
  if (row.emailsSent < limits.maxEmailPerMonth) {
    return true;
  }

  // Plan exhausted — check purchased extra credits
  const credits = await getExtraCredits(ctx, barbershopId);

  if (!credits?.emailCredits) {
    return false;
  }

  return credits.emailCredits > 0;
}

/**
 * Increment the SMS counter for a barbershop in the current month.
 * Creates the `usage` row if it doesn't exist yet (upsert pattern).
 *
 * When the plan's monthly quota is exceeded, purchased extra credits are
 * decremented instead. The `usage.smsSent` counter always increases (for
 * analytics) regardless of whether the send came from plan quota or credits.
 *
 * Writes go through `usageTriggers.wrapDB` so that `smsUsageAggregate` and
 * `emailUsageAggregate` are updated automatically — no manual sync needed.
 */
export async function incrementSmsSent(
  ctx: MutationCtx,
  barbershopId: Barbershop["_id"],
): Promise<void> {
  const month = getCurrentYearMonth();
  const existing = await getUsageRow(ctx, barbershopId, month);
  const db = usageTriggers.wrapDB(ctx).db;
  const previousSmsSent = existing?.smsSent ?? 0;

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

  // If this send exceeded the plan quota, decrement extra credits
  const barbershop = await ctx.db.get(barbershopId);
  if (barbershop) {
    const limits = await getUserPlanLimits(ctx, barbershop.ownerId);
    if (
      limits.maxSmsPerMonth !== null &&
      previousSmsSent >= limits.maxSmsPerMonth
    ) {
      const credits = await getExtraCredits(ctx, barbershopId);
      if (credits && credits.smsCredits > 0) {
        await ctx.db.patch(credits._id, {
          smsCredits: credits.smsCredits - 1,
        });
      }
    }
  }
}

/**
 * Increment the email counter for a barbershop in the current month.
 * Creates the `usage` row if it doesn't exist yet (upsert pattern).
 *
 * When the plan's monthly quota is exceeded, purchased extra credits are
 * decremented instead. The `usage.emailsSent` counter always increases (for
 * analytics) regardless of whether the send came from plan quota or credits.
 *
 * Writes go through `usageTriggers.wrapDB` so that `emailUsageAggregate` is
 * updated automatically — no manual sync needed.
 */
export async function incrementEmailSent(
  ctx: MutationCtx,
  barbershopId: Barbershop["_id"],
): Promise<void> {
  const month = getCurrentYearMonth();
  const existing = await getUsageRow(ctx, barbershopId, month);
  const db = usageTriggers.wrapDB(ctx).db;
  const previousEmailsSent = existing?.emailsSent ?? 0;

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

  // If this send exceeded the plan quota, decrement extra credits
  const barbershop = await ctx.db.get(barbershopId);
  if (barbershop) {
    const limits = await getUserPlanLimits(ctx, barbershop.ownerId);
    if (
      limits.maxEmailPerMonth !== null &&
      previousEmailsSent >= limits.maxEmailPerMonth
    ) {
      const credits = await getExtraCredits(ctx, barbershopId);
      if (credits && credits.emailCredits > 0) {
        await ctx.db.patch(credits._id, {
          emailCredits: credits.emailCredits - 1,
        });
      }
    }
  }
}
