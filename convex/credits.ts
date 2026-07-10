/**
 * Extra credit management — mutations for webhook processing and queries
 * for the UI balance display.
 */

import { ConvexError } from "convex/values";
import { z } from "zod";
import { zInternalMutation, zInternalQuery, zQuery } from ".";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getUsageRow, getUserPlanLimits } from "./acl";
import { assertShopRole } from "./authz";
import { errorMessages } from "./errors";
import { getUserId } from "./identity";
import { calculateCreditPaymentTransition } from "./mercadopagoPaymentState";
import {
  isCreditProductKey,
  MP_CREDIT_PACKS,
  MP_CURRENCY_ID,
} from "./mercadopagoPlans";
import { CREDIT_PRODUCT_KEYS, getCurrentYearMonth } from "./plans";
import type { Barbershop, MercadopagoCreditCheckout } from "./schema";
import { barbershops } from "./schema";

export async function getExtraCredits(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Barbershop["_id"],
) {
  return ctx.db
    .query("extraCredits")
    .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
    .unique();
}

/** Verify ownership and persist immutable catalog terms before creating checkout. */
export const createCheckoutIntent = zInternalMutation({
  args: z.object({
    userId: z.string(),
    barbershopId: barbershops.tools.id.shape.id,
    productKey: z.enum(CREDIT_PRODUCT_KEYS),
    checkoutReference: z.string(),
    idempotencyKey: z.string(),
    expiresAt: z.number(),
  }),
  handler: async (ctx, args) => {
    const barbershop = await ctx.db.get(args.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    if (barbershop.ownerId !== args.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const pack = MP_CREDIT_PACKS[args.productKey];
    const now = Date.now();
    await ctx.db.insert("mercadopagoCreditCheckouts", {
      userId: args.userId,
      barbershopId: barbershop._id,
      productKey: pack.productKey,
      type: pack.type,
      credits: pack.credits,
      amount: pack.amountCop,
      currencyId: MP_CURRENCY_ID,
      checkoutReference: args.checkoutReference,
      idempotencyKey: args.idempotencyKey,
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      barbershopId: barbershop._id,
      productKey: pack.productKey,
      title: pack.title,
      description: pack.description,
      amount: pack.amountCop,
      currencyId: MP_CURRENCY_ID,
      checkoutReference: args.checkoutReference,
      idempotencyKey: args.idempotencyKey,
    };
  },
});

export const completeCheckoutIntent = zInternalMutation({
  args: z.object({
    checkoutReference: z.string(),
    preferenceId: z.string(),
  }),
  handler: async (ctx, args) => {
    const checkout = await ctx.db
      .query("mercadopagoCreditCheckouts")
      .withIndex("by_checkoutReference", (q) =>
        q.eq("checkoutReference", args.checkoutReference),
      )
      .unique();

    if (checkout) {
      await ctx.db.patch(checkout._id, {
        preferenceId: args.preferenceId,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getCheckoutByReference = zInternalQuery({
  args: z.object({ checkoutReference: z.string() }),
  handler: async (ctx, args) =>
    await ctx.db
      .query("mercadopagoCreditCheckouts")
      .withIndex("by_checkoutReference", (q) =>
        q.eq("checkoutReference", args.checkoutReference),
      )
      .unique(),
});

/** Account deletion must wait until every remotely payable link has expired. */
export async function hasUnexpiredCheckout(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  now: number,
) {
  return !!(await ctx.db
    .query("mercadopagoCreditCheckouts")
    .withIndex("by_userId_and_expiresAt", (q) =>
      q.eq("userId", userId).gt("expiresAt", now),
    )
    .first());
}

export const listUnexpiredCheckoutsForUser = zInternalQuery({
  args: z.object({ userId: z.string(), now: z.number() }),
  handler: async (ctx, args) =>
    await ctx.db
      .query("mercadopagoCreditCheckouts")
      .withIndex("by_userId_and_expiresAt", (q) =>
        q.eq("userId", args.userId).gt("expiresAt", args.now),
      )
      .take(100),
});

async function applyCreditBalanceDelta(
  ctx: MutationCtx,
  checkout: MercadopagoCreditCheckout,
  balanceDelta: number,
  purchasedTotalDelta: number,
) {
  const row = await getExtraCredits(ctx, checkout.barbershopId);

  if (!row) {
    if (balanceDelta <= 0) {
      return;
    }

    await ctx.db.insert("extraCredits", {
      barbershopId: checkout.barbershopId,
      smsCredits: checkout.type === "sms" ? balanceDelta : 0,
      emailCredits: checkout.type === "email" ? balanceDelta : 0,
      smsPurchasedTotal: checkout.type === "sms" ? purchasedTotalDelta : 0,
      emailPurchasedTotal: checkout.type === "email" ? purchasedTotalDelta : 0,
    });
    return;
  }

  if (checkout.type === "sms") {
    await ctx.db.patch(row._id, {
      smsCredits: row.smsCredits + balanceDelta,
      smsPurchasedTotal: Math.max(
        0,
        row.smsPurchasedTotal + purchasedTotalDelta,
      ),
    });
  } else {
    await ctx.db.patch(row._id, {
      emailCredits: row.emailCredits + balanceDelta,
      emailPurchasedTotal: Math.max(
        0,
        row.emailPurchasedTotal + purchasedTotalDelta,
      ),
    });
  }
}

/** Apply payment status transitions exactly once, including refunds/chargebacks. */
export const applyPayment = zInternalMutation({
  args: z.object({
    paymentId: z.string(),
    checkoutReference: z.string(),
    status: z.string(),
    statusDetail: z.string().optional(),
    transactionAmount: z.number(),
    currencyId: z.string(),
    refundedAmount: z.number(),
    remoteUpdatedAt: z.number(),
  }),
  handler: async (ctx, args) => {
    const checkout = await ctx.db
      .query("mercadopagoCreditCheckouts")
      .withIndex("by_checkoutReference", (q) =>
        q.eq("checkoutReference", args.checkoutReference),
      )
      .unique();

    if (
      !checkout ||
      !isCreditProductKey(checkout.productKey) ||
      args.transactionAmount !== checkout.amount ||
      args.currencyId !== checkout.currencyId
    ) {
      throw new ConvexError("El pago no coincide con un checkout de créditos.");
    }

    const existing = await ctx.db
      .query("creditPurchases")
      .withIndex("by_paymentId", (q) => q.eq("paymentId", args.paymentId))
      .unique();

    if ((existing?.remoteUpdatedAt ?? 0) >= args.remoteUpdatedAt) {
      return false;
    }

    const balance = await getExtraCredits(ctx, checkout.barbershopId);
    const availableCredits =
      checkout.type === "sms"
        ? (balance?.smsCredits ?? 0)
        : (balance?.emailCredits ?? 0);
    const transition = calculateCreditPaymentTransition({
      status: args.status,
      statusDetail: args.statusDetail,
      transactionAmount: args.transactionAmount,
      refundedAmount: args.refundedAmount,
      credits: checkout.credits,
      availableCredits,
      previouslyGranted: existing?.granted ?? false,
      previousRefundedCredits: existing?.refundedCredits,
      previousReversedCredits: existing?.reversedCredits,
      wasEverGranted: existing?.purchasedAt !== undefined,
    });

    if (transition.balanceDelta !== 0 || transition.purchasedTotalDelta !== 0) {
      await applyCreditBalanceDelta(
        ctx,
        checkout,
        transition.balanceDelta,
        transition.purchasedTotalDelta,
      );
    }

    const fields = {
      paymentId: args.paymentId,
      checkoutReference: checkout.checkoutReference,
      barbershopId: checkout.barbershopId,
      type: checkout.type,
      // Credit count of the pack — NOT money. The COP price lives on
      // `mercadopagoCreditCheckouts.amount`; `refundedAmount` here is COP.
      amount: checkout.credits,
      status: transition.canonicalStatus,
      statusDetail: args.statusDetail,
      refundedAmount: args.refundedAmount,
      refundedCredits: transition.refundedCredits,
      granted: transition.granted,
      reversedCredits: transition.reversedCredits,
      purchasedAt:
        existing?.purchasedAt ??
        (transition.markPurchased ? Date.now() : undefined),
      remoteUpdatedAt: args.remoteUpdatedAt,
      updatedAt: Date.now(),
    } as const;

    if (existing) {
      await ctx.db.patch(existing._id, fields);
    } else {
      await ctx.db.insert("creditPurchases", fields);
    }

    return true;
  },
});

/**
 * Returns the extra credit balance for the current user's barbershop.
 * Returns `null` if no extra credits have ever been purchased.
 */
export const getMyExtraCredits = zQuery({
  handler: async (ctx) => {
    const userId = await getUserId(ctx);

    if (!userId) {
      return null;
    }

    const barbershop = await ctx.db
      .query("barbershops")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .first();

    if (!barbershop) {
      return null;
    }

    return getExtraCredits(ctx, barbershop._id);
  },
});

export const getBarbershopQuotaUsage = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    if (!userId) {
      return null;
    }

    const barbershop = await ctx.db.get(args.id);

    if (!barbershop) {
      return null;
    }

    try {
      await assertShopRole(ctx, args.id, userId, ["barber", "owner", "staff"]);
    } catch {
      return null;
    }

    const limits = await getUserPlanLimits(ctx, barbershop.ownerId);
    const month = getCurrentYearMonth();
    const row = await getUsageRow(ctx, args.id, month);

    return {
      month,
      smsUsed: row?.smsSent ?? 0,
      emailsUsed: row?.emailsSent ?? 0,
      maxSmsPerMonth: limits.maxSmsPerMonth,
      maxEmailPerMonth: limits.maxEmailPerMonth,
    };
  },
});
