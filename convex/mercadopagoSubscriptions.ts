/** MercadoPago subscription persistence and paid-plan entitlement logic. */

import { ConvexError } from "convex/values";
import { z } from "zod";

import { zInternalMutation, zInternalQuery, zQuery } from ".";
import { internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getUserId } from "./identity";
import {
  isEntitlingPaymentStatus,
  isReversedPaymentStatus,
} from "./mercadopagoPaymentState";
import {
  MP_CURRENCY_ID,
  MP_FREE_PRODUCT_KEY,
  type MpSubscriptionStatus,
  normalizeMpStatus,
} from "./mercadopagoPlans";
import {
  hasActivePaidEntitlement,
  initialTrialEndsAt,
} from "./mercadopagoSubscriptionState";
import { getLimitsForProductKey, getTierForProductKey } from "./plans";
import type { MercadopagoSubscription } from "./schema";

const SUBSCRIPTION_STATUSES: readonly MpSubscriptionStatus[] = [
  "active",
  "paused",
  "pending",
  "canceled",
];
const OPEN_PAID_STATUSES: readonly MpSubscriptionStatus[] = [
  "active",
  "paused",
  "pending",
];
const ROWS_PER_STATUS = 10;
const DELETE_BATCH_SIZE = 100;

const STATUS_PRIORITY: Record<MpSubscriptionStatus, number> = {
  active: 0,
  paused: 1,
  pending: 2,
  canceled: 3,
};

async function collectRowsByStatuses(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  statuses: readonly MpSubscriptionStatus[],
  limit = ROWS_PER_STATUS,
) {
  const batches = await Promise.all(
    statuses.map((status) =>
      ctx.db
        .query("mercadopagoSubscriptions")
        .withIndex("by_userId_and_status", (q) =>
          q.eq("userId", userId).eq("status", status),
        )
        .order("desc")
        .take(limit),
    ),
  );

  return batches.flat();
}

function pickDisplayRow(
  rows: MercadopagoSubscription[],
): MercadopagoSubscription | null {
  if (rows.length === 0) {
    return null;
  }

  return rows.reduce((best, row) => {
    const bestPriority = STATUS_PRIORITY[best.status];
    const rowPriority = STATUS_PRIORITY[row.status];

    if (rowPriority !== bestPriority) {
      return rowPriority < bestPriority ? row : best;
    }

    const bestIsPaid = !!best.preapprovalId;
    const rowIsPaid = !!row.preapprovalId;
    if (rowIsPaid !== bestIsPaid) {
      return rowIsPaid ? row : best;
    }

    return row._creationTime > best._creationTime ? row : best;
  });
}

function hasEntitlement(row: MercadopagoSubscription, now: number) {
  if (!row.preapprovalId) {
    return row.status === "active" && row.productKey === MP_FREE_PRODUCT_KEY;
  }

  return hasActivePaidEntitlement(row, now);
}

function pickEntitlementRow(
  rows: MercadopagoSubscription[],
  now = Date.now(),
): MercadopagoSubscription | null {
  const entitled = rows.filter((row) => hasEntitlement(row, now));

  if (entitled.length === 0) {
    return null;
  }

  return entitled.reduce((best, row) => {
    const bestIsPaid = !!best.preapprovalId;
    const rowIsPaid = !!row.preapprovalId;

    if (rowIsPaid !== bestIsPaid) {
      return rowIsPaid ? row : best;
    }

    return (row.paidThrough ?? row._creationTime) >
      (best.paidThrough ?? best._creationTime)
      ? row
      : best;
  });
}

function pickOpenPaidRow(rows: MercadopagoSubscription[]) {
  return (
    rows
      .filter(
        (row) => !!row.preapprovalId && OPEN_PAID_STATUSES.includes(row.status),
      )
      .sort(
        (a, b) =>
          STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] ||
          b._creationTime - a._creationTime,
      )[0] ?? null
  );
}

/** The single paid-or-free entitlement used by every ACL and plan resolver. */
export async function getEffectiveSubscription(
  ctx: QueryCtx | MutationCtx,
  userId: string,
) {
  const rows = await collectRowsByStatuses(ctx, userId, SUBSCRIPTION_STATUSES);
  const entitlement = pickEntitlementRow(rows);
  const effectiveProductKey = entitlement?.productKey;
  const planTier = getTierForProductKey(effectiveProductKey);
  const planLimits = getLimitsForProductKey(effectiveProductKey);

  return {
    productKey: effectiveProductKey,
    effectiveProductKey,
    status: entitlement?.status,
    isSubscribed: !!entitlement,
    planTier,
    planLimits,
    isFree: planTier === "free",
    isPro: planTier === "pro",
    isPremium: planTier === "premium",
  };
}

/** Bounded checkout guard input plus an overflow fail-closed signal. */
export const listOpenPaidSubscriptions = zInternalQuery({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) => {
    const batches = await Promise.all(
      OPEN_PAID_STATUSES.map((status) =>
        ctx.db
          .query("mercadopagoSubscriptions")
          .withIndex("by_userId_and_status", (q) =>
            q.eq("userId", args.userId).eq("status", status),
          )
          .order("desc")
          .take(ROWS_PER_STATUS + 1),
      ),
    );
    const hasOverflow = batches.some((batch) => batch.length > ROWS_PER_STATUS);

    return {
      hasOverflow,
      rows: batches.flatMap((batch) =>
        batch.slice(0, ROWS_PER_STATUS).flatMap((row) =>
          row.preapprovalId
            ? [
                {
                  preapprovalId: row.preapprovalId,
                  productKey: row.productKey,
                  status: row.status,
                  paidThrough: row.paidThrough,
                },
              ]
            : [],
        ),
      ),
    };
  },
});

export const getByPreapproval = zInternalQuery({
  args: z.object({ preapprovalId: z.string() }),
  handler: async (ctx, args) =>
    ctx.db
      .query("mercadopagoSubscriptions")
      .withIndex("by_preapprovalId", (q) =>
        q.eq("preapprovalId", args.preapprovalId),
      )
      .unique(),
});

export const getByExternalReference = zInternalQuery({
  args: z.object({ externalReference: z.string() }),
  handler: async (ctx, args) =>
    ctx.db
      .query("mercadopagoSubscriptions")
      .withIndex("by_externalReference", (q) =>
        q.eq("externalReference", args.externalReference),
      )
      .unique(),
});

export const getOpenPaidSubscription = zInternalQuery({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) => {
    const rows = await collectRowsByStatuses(
      ctx,
      args.userId,
      OPEN_PAID_STATUSES,
    );
    return pickOpenPaidRow(rows);
  },
});

function isStaleAgreementUpdate(
  existing: MercadopagoSubscription,
  incomingStatus: MpSubscriptionStatus,
  incomingUpdatedAt: number | undefined,
) {
  if (existing.remoteUpdatedAt !== undefined) {
    if (incomingUpdatedAt === undefined) {
      return true;
    }
    if (incomingUpdatedAt < existing.remoteUpdatedAt) {
      return true;
    }
    if (
      incomingUpdatedAt === existing.remoteUpdatedAt &&
      existing.status === "canceled" &&
      incomingStatus !== "canceled"
    ) {
      return true;
    }
  }

  return false;
}

/** Apply mutable remote state without allowing it to rewrite checkout ownership. */
export const applyPreapprovalState = zInternalMutation({
  args: z.object({
    preapprovalId: z.string(),
    mpStatus: z.string(),
    payerEmail: z.string().optional(),
    reason: z.string().optional(),
    nextPaymentDate: z.string().optional(),
    remoteUpdatedAt: z.number().optional(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mercadopagoSubscriptions")
      .withIndex("by_preapprovalId", (q) =>
        q.eq("preapprovalId", args.preapprovalId),
      )
      .unique();

    if (!existing) {
      return false;
    }

    const status = normalizeMpStatus(args.mpStatus);
    if (isStaleAgreementUpdate(existing, status, args.remoteUpdatedAt)) {
      return false;
    }

    const trialEndsAt = initialTrialEndsAt({
      existingTrialEndsAt: existing.trialEndsAt,
      mpStatus: args.mpStatus,
      nextPaymentDate: args.nextPaymentDate,
      trialDays: existing.trialDays,
    });

    await ctx.db.patch(existing._id, {
      status,
      mpStatus: args.mpStatus,
      ...(args.payerEmail !== undefined && { payerEmail: args.payerEmail }),
      ...(args.reason !== undefined && { reason: args.reason }),
      ...(args.nextPaymentDate !== undefined && {
        nextPaymentDate: args.nextPaymentDate,
      }),
      ...(trialEndsAt !== undefined && { trialEndsAt }),
      ...(args.remoteUpdatedAt !== undefined && {
        remoteUpdatedAt: args.remoteUpdatedAt,
      }),
      updatedAt: Date.now(),
    });

    if (status === "canceled") {
      const attempt = await ctx.db
        .query("mercadopagoCheckoutAttempts")
        .withIndex("by_preapprovalId", (q) =>
          q.eq("preapprovalId", args.preapprovalId),
        )
        .unique();
      if (attempt) {
        await ctx.db.delete(attempt._id);
      }
    } else if (
      existing.trialEndsAt === undefined &&
      trialEndsAt !== undefined &&
      trialEndsAt > Date.now()
    ) {
      await ctx.scheduler.runAt(
        trialEndsAt,
        internal.mercadopagoSubscriptions.refreshTrialEntitlement,
        { preapprovalId: args.preapprovalId, trialEndsAt },
      );
    }

    return true;
  },
});

/** Record an invoice transition and extend access only after approved payment. */
export const recordAuthorizedPayment = zInternalMutation({
  args: z.object({
    preapprovalId: z.string(),
    invoiceId: z.string(),
    paymentId: z.string(),
    paymentStatus: z.string(),
    paidThrough: z.number().optional(),
    paymentUpdatedAt: z.number(),
    mpStatus: z.string(),
    remoteUpdatedAt: z.number().optional(),
    nextPaymentDate: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mercadopagoSubscriptions")
      .withIndex("by_preapprovalId", (q) =>
        q.eq("preapprovalId", args.preapprovalId),
      )
      .unique();

    if (!existing) {
      return false;
    }

    const payment = await ctx.db
      .query("mercadopagoSubscriptionPayments")
      .withIndex("by_paymentId", (q) => q.eq("paymentId", args.paymentId))
      .unique();

    if (payment && payment.remoteUpdatedAt >= args.paymentUpdatedAt) {
      return false;
    }

    if (
      payment &&
      (payment.userId !== existing.userId ||
        payment.preapprovalId !== args.preapprovalId)
    ) {
      throw new ConvexError(
        "El pago no coincide con la suscripción que lo registró.",
      );
    }

    const now = Date.now();
    const agreementStatus = normalizeMpStatus(args.mpStatus);
    const applyAgreement = !isStaleAgreementUpdate(
      existing,
      agreementStatus,
      args.remoteUpdatedAt,
    );
    const entitling = isEntitlingPaymentStatus(args.paymentStatus);
    const shouldRevoke =
      isReversedPaymentStatus(args.paymentStatus) &&
      existing.entitlementPaymentId === args.paymentId;
    const updateLastPayment =
      (existing.paymentUpdatedAt ?? 0) <= args.paymentUpdatedAt;
    let paidThrough = existing.paidThrough;
    let entitlementPaymentId = existing.entitlementPaymentId;

    if (
      entitling &&
      args.paidThrough !== undefined &&
      args.paidThrough >= (existing.paidThrough ?? 0)
    ) {
      paidThrough = args.paidThrough;
      entitlementPaymentId = args.paymentId;
    } else if (shouldRevoke) {
      paidThrough = Math.min(existing.paidThrough ?? now, now);
    }

    await ctx.db.patch(existing._id, {
      ...(applyAgreement && {
        status: agreementStatus,
        mpStatus: args.mpStatus,
        ...(args.remoteUpdatedAt !== undefined && {
          remoteUpdatedAt: args.remoteUpdatedAt,
        }),
      }),
      ...(args.nextPaymentDate !== undefined && {
        nextPaymentDate: args.nextPaymentDate,
      }),
      paidThrough,
      entitlementPaymentId,
      ...(updateLastPayment && {
        lastInvoiceId: args.invoiceId,
        lastPaymentId: args.paymentId,
        lastPaymentStatus: args.paymentStatus,
        paymentUpdatedAt: args.paymentUpdatedAt,
      }),
      updatedAt: now,
    });

    const paymentFields = {
      userId: existing.userId,
      preapprovalId: args.preapprovalId,
      paymentId: args.paymentId,
      invoiceId: args.invoiceId,
      status: args.paymentStatus,
      paidThrough: args.paidThrough ?? payment?.paidThrough,
      remoteUpdatedAt: args.paymentUpdatedAt,
      updatedAt: now,
    } as const;

    if (payment) {
      await ctx.db.patch(payment._id, paymentFields);
    } else {
      await ctx.db.insert("mercadopagoSubscriptionPayments", paymentFields);
    }

    if (entitling && paidThrough !== undefined && paidThrough > now) {
      await ctx.scheduler.runAt(
        paidThrough,
        internal.mercadopagoSubscriptions.refreshEntitlement,
        { preapprovalId: args.preapprovalId, paidThrough },
      );
    }

    return true;
  },
});

/** Trigger reactive clients when a paid period expires without a later renewal. */
export const refreshEntitlement = zInternalMutation({
  args: z.object({ preapprovalId: z.string(), paidThrough: z.number() }),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("mercadopagoSubscriptions")
      .withIndex("by_preapprovalId", (q) =>
        q.eq("preapprovalId", args.preapprovalId),
      )
      .unique();

    if (
      row?.paidThrough === args.paidThrough &&
      row.paidThrough <= Date.now()
    ) {
      await ctx.db.patch(row._id, { updatedAt: Date.now() });
    }
  },
});

/** Trigger reactive clients if the first charge is delayed past trial expiry. */
export const refreshTrialEntitlement = zInternalMutation({
  args: z.object({ preapprovalId: z.string(), trialEndsAt: z.number() }),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("mercadopagoSubscriptions")
      .withIndex("by_preapprovalId", (q) =>
        q.eq("preapprovalId", args.preapprovalId),
      )
      .unique();

    if (
      row?.trialEndsAt === args.trialEndsAt &&
      row.trialEndsAt <= Date.now() &&
      (row.paidThrough ?? 0) <= Date.now()
    ) {
      await ctx.db.patch(row._id, { updatedAt: Date.now() });
    }
  },
});

/** Seed the local free fallback without displacing a paid entitlement. */
export async function ensureFreeSubscription(ctx: MutationCtx, userId: string) {
  const now = Date.now();
  const existingFree = await ctx.db
    .query("mercadopagoSubscriptions")
    .withIndex("by_userId_and_productKey", (q) =>
      q.eq("userId", userId).eq("productKey", MP_FREE_PRODUCT_KEY),
    )
    .order("desc")
    .first();

  if (existingFree) {
    if (
      existingFree.status !== "active" ||
      existingFree.mpStatus !== undefined
    ) {
      await ctx.db.patch(existingFree._id, {
        status: "active",
        mpStatus: undefined,
        updatedAt: now,
      });
    }
    return existingFree._id;
  }

  return ctx.db.insert("mercadopagoSubscriptions", {
    userId,
    productKey: MP_FREE_PRODUCT_KEY,
    status: "active",
    currencyId: MP_CURRENCY_ID,
    amount: 0,
    updatedAt: now,
  });
}

export const seedFree = zInternalMutation({
  args: z.object({ userId: z.string() }),
  handler: (ctx, args) => ensureFreeSubscription(ctx, args.userId),
});

export const activateFree = zInternalMutation({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) => {
    const openPaid = await collectRowsByStatuses(
      ctx,
      args.userId,
      OPEN_PAID_STATUSES,
    );

    if (openPaid.some((row) => !!row.preapprovalId)) {
      throw new ConvexError(
        "Tienes un checkout o una suscripción de pago abierta. Resuélvela antes de activar el plan gratis.",
      );
    }

    return ensureFreeSubscription(ctx, args.userId);
  },
});

/** Client-safe DTO: provider identifiers, checkout URLs, and payer PII stay private. */
export const getMySubscription = zQuery({
  args: z.object({}),
  handler: async (ctx) => {
    const userId = await getUserId(ctx);

    if (!userId) {
      return null;
    }

    const rows = await collectRowsByStatuses(
      ctx,
      userId,
      SUBSCRIPTION_STATUSES,
    );
    const display = pickDisplayRow(rows);
    const entitlement = pickEntitlementRow(rows);
    const effectiveProductKey = entitlement?.productKey;
    const planTier = getTierForProductKey(effectiveProductKey);
    const planLimits = getLimitsForProductKey(effectiveProductKey);
    const livePaid = pickOpenPaidRow(rows);

    return {
      productKey: display?.productKey,
      status: display?.status,
      nextPaymentDate: display?.nextPaymentDate,
      effectiveProductKey,
      planTier,
      planLimits,
      isSubscribed: !!entitlement,
      isFree: planTier === "free",
      isPro: planTier === "pro",
      isPremium: planTier === "premium",
      livePaid: livePaid
        ? { productKey: livePaid.productKey, status: livePaid.status }
        : null,
    };
  },
});

/** Delete billing PII in bounded batches after account cancellation/deletion. */
export async function deleteUserBillingData(ctx: MutationCtx, userId: string) {
  const [rows, payments] = await Promise.all([
    ctx.db
      .query("mercadopagoSubscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(DELETE_BATCH_SIZE),
    ctx.db
      .query("mercadopagoSubscriptionPayments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(DELETE_BATCH_SIZE),
  ]);

  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  for (const payment of payments) {
    await ctx.db.delete(payment._id);
  }

  // `acquire` keeps one attempt per user, but deletion must survive even a
  // violated invariant — never abort account cleanup on `.unique()`.
  const attempts = await ctx.db
    .query("mercadopagoCheckoutAttempts")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(DELETE_BATCH_SIZE);
  for (const attempt of attempts) {
    await ctx.db.delete(attempt._id);
  }

  if (
    rows.length === DELETE_BATCH_SIZE ||
    payments.length === DELETE_BATCH_SIZE ||
    attempts.length === DELETE_BATCH_SIZE
  ) {
    await ctx.scheduler.runAfter(
      0,
      internal.mercadopagoSubscriptions.deleteUserBillingRows,
      { userId },
    );
  }
}

export const deleteUserBillingRows = zInternalMutation({
  args: z.object({ userId: z.string() }),
  handler: (ctx, args) => deleteUserBillingData(ctx, args.userId),
});
