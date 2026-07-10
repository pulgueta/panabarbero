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

import { ConvexError } from "convex/values";
import { z } from "zod";

import { zAuthMutation, zInternalMutation, zInternalQuery, zQuery } from ".";
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
 *
 * Unlike Polar's `getCurrentSubscription` (which only surfaces the active row),
 * this returns the effective row across **all** statuses so the UI can render
 * `pending` / `paused` / `canceled` states. Any entitlement derivation (tier,
 * limits) MUST therefore gate on `status` being `active` / `trialing` — a
 * canceled or pending paid row must never confer a paid tier. See the
 * status-aware derivation in `getMySubscription` and mirror it when swapping
 * this in for Polar in `convex/acl.ts`.
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

    // Same status → a real preapproval (paid) outranks a local free row, so an
    // active paid subscription is never shadowed by a free row activated later
    // (this only affects equal-status ties; a canceled paid row still loses to
    // an active free row on priority above and correctly falls back to free).
    const bestIsPaid = !!best.preapprovalId;
    const rowIsPaid = !!row.preapprovalId;
    if (rowIsPaid !== bestIsPaid) {
      return rowIsPaid ? row : best;
    }

    // Otherwise prefer the most recently created row.
    return row._creationTime > best._creationTime ? row : best;
  });
}

/**
 * The single MercadoPago-backed effective subscription for a user — the source
 * of truth for plan gating. Replaces `polar.getCurrentSubscription`: the ACL and
 * the `auth.*` subscription queries all read from here.
 *
 * Only an `active`/`trialing` row confers a paid tier; a `pending`, `paused`, or
 * `canceled` paid row (and a user with no MercadoPago rows at all) resolves to
 * free. `productKey` is the RAW row key so the UI can still label a canceled
 * plan; the tier is derived from the status-gated `effectiveProductKey`.
 */
export async function getEffectiveSubscription(
  ctx: QueryCtx | MutationCtx,
  userId: string,
) {
  const subscription = await getCurrentMpSubscription(ctx, userId);
  const isSubscribed =
    subscription?.status === "active" || subscription?.status === "trialing";
  const effectiveProductKey = isSubscribed
    ? subscription?.productKey
    : undefined;
  const planTier = getTierForProductKey(effectiveProductKey);
  const planLimits = getLimitsForProductKey(effectiveProductKey);

  return {
    productKey: subscription?.productKey,
    effectiveProductKey,
    status: subscription?.status,
    isSubscribed,
    planTier,
    planLimits,
    isFree: planTier === "free",
    isPro: planTier === "pro",
    isPremium: planTier === "premium",
  };
}

/**
 * Statuses under which a paid preapproval can still bill or be reactivated at
 * MercadoPago (a paused one resumes on a successful payment retry).
 */
const LIVE_PAID_STATUSES: readonly MpSubscriptionStatus[] = [
  "active",
  "trialing",
  "paused",
];

/**
 * The user's live paid preapproval, even when the effective-subscription
 * resolver shadows it (a paused paid row loses to the seeded active free row
 * on status priority). Cancellation and plan-switch gating key off this —
 * never off the effective row — so a paused subscription stays cancellable
 * and visible in the UI.
 */
export async function getLivePaidSubscription(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<MercadopagoSubscription | null> {
  const rows = await ctx.db
    .query("mercadopagoSubscriptions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  const live = rows
    .filter(
      (row) => !!row.preapprovalId && LIVE_PAID_STATUSES.includes(row.status),
    )
    .sort(
      (a, b) =>
        LIVE_PAID_STATUSES.indexOf(a.status) -
        LIVE_PAID_STATUSES.indexOf(b.status),
    );

  return live[0] ?? null;
}

/**
 * All of a user's paid preapprovals that MercadoPago could still act on
 * (anything not canceled — including abandoned `pending` checkouts, which the
 * effective-subscription resolver hides behind an active free row). The
 * subscription-checkout action cancels each of these before creating a new
 * preapproval so recurring charges can never stack.
 */
export const listOpenPaidSubscriptions = zInternalQuery({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("mercadopagoSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return rows.flatMap((row) =>
      row.preapprovalId && row.status !== "canceled"
        ? [
            {
              preapprovalId: row.preapprovalId,
              productKey: row.productKey,
              status: row.status,
            },
          ]
        : [],
    );
  },
});

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
/**
 * Idempotently ensure the user holds an active local free entitlement row (no
 * MercadoPago preapproval). This is the "represent free as a local active
 * entitlement" primitive — called before the first barbershop creation and by
 * the `subscribeFree` UI action. Safe to run alongside a paid row: the
 * effective-sub resolver prefers an active paid preapproval over the free row.
 */
export async function ensureFreeSubscription(ctx: MutationCtx, userId: string) {
  const now = Date.now();

  const rows = await ctx.db
    .query("mercadopagoSubscriptions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();

  const existingFree = rows.find(
    (row) => row.productKey === MP_FREE_PRODUCT_KEY && !row.preapprovalId,
  );

  if (existingFree) {
    if (existingFree.status !== "active") {
      await ctx.db.patch(existingFree._id, {
        status: "active",
        mpStatus: "authorized",
        updatedAt: now,
      });
    }
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
}

export const subscribeFree = zAuthMutation({
  args: z.object({}),
  handler: async (ctx) => {
    const { userId } = ctx;

    const rows = await ctx.db
      .query("mercadopagoSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Refuse while a still-billing paid preapproval exists — a local free row
    // would shadow it (hiding the cancel button) while MercadoPago keeps
    // charging. This mutation can't reach the SDK to cancel remotely, so require
    // an explicit cancel first.
    const activePaid = rows.find(
      (row) =>
        !!row.preapprovalId &&
        (row.status === "active" ||
          row.status === "trialing" ||
          row.status === "paused"),
    );

    if (activePaid) {
      throw new ConvexError(
        "Tienes una suscripción de pago activa. Cancélala antes de activar el plan gratis.",
      );
    }

    return ensureFreeSubscription(ctx, userId);
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
    const isSubscribed =
      subscription?.status === "active" || subscription?.status === "trialing";

    // Only an effectively-active subscription grants a paid tier. A canceled,
    // paused, or pending paid row must not confer Pro/Premium entitlements.
    const effectiveProductKey = isSubscribed
      ? subscription?.productKey
      : undefined;
    const planTier = getTierForProductKey(effectiveProductKey);
    const planLimits = getLimitsForProductKey(effectiveProductKey);

    // Surfaced separately from the effective row because a paused paid
    // preapproval is shadowed by the active free row yet still needs a cancel
    // button and must keep the plan-switch paths closed.
    const livePaid = await getLivePaidSubscription(ctx, userId);

    return {
      ...subscription,
      planTier,
      planLimits,
      isSubscribed,
      isFree: planTier === "free",
      isPro: planTier === "pro",
      isPremium: planTier === "premium",
      livePaid: livePaid?.preapprovalId
        ? {
            productKey: livePaid.productKey,
            status: livePaid.status,
            preapprovalId: livePaid.preapprovalId,
          }
        : null,
    };
  },
});
