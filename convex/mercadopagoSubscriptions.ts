/**
 * MercadoPago subscription database layer + tier resolver.
 *
 * This is the read/write half of the MercadoPago integration (the network half
 * lives in `convex/mercadopago.ts`, a `"use node"` action file). Nothing here
 * imports the SDK, so it runs in the fast V8 runtime and can be called from
 * queries, mutations, and the webhook path alike.
 *
 * `getCurrentMpSubscription` returns a `{ productKey, status }`-shaped row that
 * is a drop-in substitute for `polar.getCurrentSubscription`. Swapping the two
 * calls in `convex/acl.ts` (and the two `convex/auth.ts` subscription queries)
 * is all it takes to make MercadoPago the source of truth — see
 * `docs/mercadopago-subscriptions.md`.
 */

import { z } from "zod";

import { zAuthMutation, zInternalMutation, zQuery } from ".";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getUserId } from "./identity";
import {
  MP_CURRENCY_ID,
  MP_FREE_PRODUCT_KEY,
  type MpSubscriptionStatus,
  normalizeMpStatus,
} from "./mercadopagoPlans";
import { getLimitsForProductKey, getTierForProductKey } from "./plans";
import type { MercadopagoSubscription } from "./schema";

/**
 * Effective-subscription priority. When a user has several rows (e.g. an old
 * canceled attempt plus a fresh authorized one) the lowest priority wins.
 */
const STATUS_PRIORITY: Record<MpSubscriptionStatus, number> = {
  active: 0,
  trialing: 1,
  paused: 2,
  pending: 3,
  canceled: 4,
};

/**
 * Resolve the effective MercadoPago subscription for a user, or `null` when the
 * user has never interacted with MercadoPago. Shape-compatible with
 * `polar.getCurrentSubscription` for the fields the ACL reads (`productKey`,
 * `status`).
 */
export async function getCurrentMpSubscription(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<MercadopagoSubscription | null> {
  const rows = await ctx.db
    .query("mercadopagoSubscriptions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  if (rows.length === 0) {
    return null;
  }

  return rows.reduce((best, row) => {
    const bestPriority = STATUS_PRIORITY[best.status];
    const rowPriority = STATUS_PRIORITY[row.status];

    if (rowPriority !== bestPriority) {
      return rowPriority < bestPriority ? row : best;
    }

    // Same status → prefer the most recently created row.
    return row._creationTime > best._creationTime ? row : best;
  });
}

/**
 * Upsert a subscription row from a MercadoPago preapproval. Called both after
 * creating a checkout (with the freshly-created preapproval) and from the
 * webhook (on every subsequent lifecycle change). Keyed by `preapprovalId` so
 * repeated webhooks are idempotent. Only fields that are present in `args` are
 * written, so a lifecycle webhook never clears the stored `initPoint`.
 */
export const upsertByPreapproval = zInternalMutation({
  args: z.object({
    userId: z.string(),
    productKey: z.string(),
    preapprovalId: z.string(),
    mpStatus: z.string(),
    payerEmail: z.string().optional(),
    reason: z.string().optional(),
    amount: z.number().optional(),
    currencyId: z.string().optional(),
    initPoint: z.string().optional(),
    externalReference: z.string().optional(),
    nextPaymentDate: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const status = normalizeMpStatus(args.mpStatus);
    const now = Date.now();

    const existing = await ctx.db
      .query("mercadopagoSubscriptions")
      .withIndex("by_preapprovalId", (q) =>
        q.eq("preapprovalId", args.preapprovalId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: args.userId,
        productKey: args.productKey,
        status,
        mpStatus: args.mpStatus,
        ...(args.payerEmail !== undefined && { payerEmail: args.payerEmail }),
        ...(args.reason !== undefined && { reason: args.reason }),
        ...(args.amount !== undefined && { amount: args.amount }),
        ...(args.currencyId !== undefined && { currencyId: args.currencyId }),
        ...(args.initPoint !== undefined && { initPoint: args.initPoint }),
        ...(args.externalReference !== undefined && {
          externalReference: args.externalReference,
        }),
        ...(args.nextPaymentDate !== undefined && {
          nextPaymentDate: args.nextPaymentDate,
        }),
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("mercadopagoSubscriptions", {
      userId: args.userId,
      productKey: args.productKey,
      status,
      mpStatus: args.mpStatus,
      preapprovalId: args.preapprovalId,
      payerEmail: args.payerEmail,
      reason: args.reason,
      amount: args.amount,
      currencyId: args.currencyId,
      initPoint: args.initPoint,
      externalReference: args.externalReference,
      nextPaymentDate: args.nextPaymentDate,
      updatedAt: now,
    });
  },
});

/**
 * Subscribe the current user to the free plan. MercadoPago cannot bill a $0
 * recurring charge, so the free tier is a local-only row (no preapproval). This
 * satisfies `assertIsSubscribed` the same way a Polar free subscription does.
 */
export const subscribeFree = zAuthMutation({
  args: z.object({}),
  handler: async (ctx) => {
    const { userId } = ctx;
    const now = Date.now();

    const rows = await ctx.db
      .query("mercadopagoSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const existingFree = rows.find(
      (row) => row.productKey === MP_FREE_PRODUCT_KEY && !row.preapprovalId,
    );

    if (existingFree) {
      await ctx.db.patch(existingFree._id, {
        status: "active",
        mpStatus: "authorized",
        updatedAt: now,
      });
      return existingFree._id;
    }

    return ctx.db.insert("mercadopagoSubscriptions", {
      userId,
      productKey: MP_FREE_PRODUCT_KEY,
      status: "active",
      mpStatus: "authorized",
      currencyId: MP_CURRENCY_ID,
      amount: 0,
      updatedAt: now,
    });
  },
});

/**
 * Current-user subscription for the UI. Mirrors the return shape of
 * `auth.getUserSubscription` (Polar) so the client can consume either provider
 * with the same fields. Returns `null` when unauthenticated.
 */
export const getMySubscription = zQuery({
  args: z.object({}),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);

    if (!userId) {
      return null;
    }

    const subscription = await getCurrentMpSubscription(ctx, userId);
    const planTier = getTierForProductKey(subscription?.productKey);
    const planLimits = getLimitsForProductKey(subscription?.productKey);

    return {
      ...subscription,
      planTier,
      planLimits,
      isSubscribed:
        subscription?.status === "active" ||
        subscription?.status === "trialing",
      isFree: planTier === "free",
      isPro: planTier === "pro",
      isPremium: planTier === "premium",
    };
  },
});
