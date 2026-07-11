import { ConvexError } from "convex/values";
import { z } from "zod";

import { zInternalMutation, zInternalQuery } from ".";
import { normalizeMpStatus } from "./mercadopagoPlans";
import { trialDaysForCheckout } from "./mercadopagoSubscriptionState";

const CHECKOUT_LEASE_MS = 5 * 60 * 1000;

export const getForUser = zInternalQuery({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) =>
    ctx.db
      .query("mercadopagoCheckoutAttempts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique(),
});

/**
 * Atomically claims subscription checkout creation for one user. Convex retries
 * concurrent range conflicts, so only one caller can insert the per-user row.
 * An expired creator may resume with the same immutable idempotency key.
 */
export const acquire = zInternalMutation({
  args: z.object({
    userId: z.string(),
    productKey: z.string(),
    payerEmail: z.email(),
    checkoutReference: z.string(),
    idempotencyKey: z.string(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("mercadopagoCheckoutAttempts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      if (existing.state === "ready") {
        return existing;
      }

      if (existing.leaseExpiresAt > now) {
        throw new ConvexError(
          "Tu checkout ya se está creando. Espera unos segundos e inténtalo de nuevo.",
        );
      }

      // Resume the immutable stored attempt even when this caller requested
      // different terms. The action must recover the remote result with the
      // original idempotency key before it can safely cancel or replace it.
      await ctx.db.patch(existing._id, {
        leaseExpiresAt: now + CHECKOUT_LEASE_MS,
        updatedAt: now,
      });

      return {
        ...existing,
        leaseExpiresAt: now + CHECKOUT_LEASE_MS,
        updatedAt: now,
      };
    }

    const consumedTrial = await ctx.db
      .query("mercadopagoSubscriptions")
      .withIndex("by_userId_and_trialEndsAt", (q) =>
        q.eq("userId", args.userId).gt("trialEndsAt", 0),
      )
      .first();
    const trialDays = trialDaysForCheckout(consumedTrial !== null);

    const id = await ctx.db.insert("mercadopagoCheckoutAttempts", {
      ...args,
      trialDays,
      state: "creating",
      leaseExpiresAt: now + CHECKOUT_LEASE_MS,
      createdAt: now,
      updatedAt: now,
    });

    return {
      userId: args.userId,
      productKey: args.productKey,
      payerEmail: args.payerEmail,
      checkoutReference: args.checkoutReference,
      idempotencyKey: args.idempotencyKey,
      trialDays,
      state: "creating" as const,
      leaseExpiresAt: now + CHECKOUT_LEASE_MS,
      createdAt: now,
      updatedAt: now,
      _id: id,
    };
  },
});

/** Make a failed creator immediately resumable with the same idempotency key. */
export const releaseLease = zInternalMutation({
  args: z.object({ checkoutReference: z.string() }),
  handler: async (ctx, args) => {
    const attempt = await ctx.db
      .query("mercadopagoCheckoutAttempts")
      .withIndex("by_checkoutReference", (q) =>
        q.eq("checkoutReference", args.checkoutReference),
      )
      .unique();

    if (attempt?.state === "creating") {
      await ctx.db.patch(attempt._id, {
        leaseExpiresAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Persist the remote preapproval and make the checkout result reusable in one
 * transaction. Identity, product, amount, and currency come from the claim,
 * never from a later webhook's mutable external reference.
 */
export const complete = zInternalMutation({
  args: z.object({
    checkoutReference: z.string(),
    preapprovalId: z.string(),
    mpStatus: z.string(),
    payerEmail: z.string().optional(),
    reason: z.string().optional(),
    amount: z.number(),
    currencyId: z.string(),
    initPoint: z.string(),
    nextPaymentDate: z.string().optional(),
    trialDays: z.number().int().positive().nullable(),
    remoteUpdatedAt: z.number().optional(),
  }),
  handler: async (ctx, args) => {
    const attempt = await ctx.db
      .query("mercadopagoCheckoutAttempts")
      .withIndex("by_checkoutReference", (q) =>
        q.eq("checkoutReference", args.checkoutReference),
      )
      .unique();

    if (!attempt) {
      throw new ConvexError("El intento de checkout ya no existe.");
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("mercadopagoSubscriptions")
      .withIndex("by_preapprovalId", (q) =>
        q.eq("preapprovalId", args.preapprovalId),
      )
      .unique();

    const subscriptionFields = {
      userId: attempt.userId,
      productKey: attempt.productKey,
      status: normalizeMpStatus(args.mpStatus),
      mpStatus: args.mpStatus,
      preapprovalId: args.preapprovalId,
      payerEmail: args.payerEmail ?? attempt.payerEmail,
      reason: args.reason,
      amount: args.amount,
      currencyId: args.currencyId,
      initPoint: args.initPoint,
      externalReference: attempt.checkoutReference,
      nextPaymentDate: args.nextPaymentDate,
      trialDays: args.trialDays ?? undefined,
      remoteUpdatedAt: args.remoteUpdatedAt,
      updatedAt: now,
    } as const;

    if (existing) {
      if (
        existing.userId !== attempt.userId ||
        existing.productKey !== attempt.productKey
      ) {
        throw new ConvexError(
          "El preapproval no coincide con el checkout que lo creó.",
        );
      }
      await ctx.db.patch(existing._id, subscriptionFields);
    } else {
      await ctx.db.insert("mercadopagoSubscriptions", subscriptionFields);
    }

    await ctx.db.patch(attempt._id, {
      state: "ready",
      preapprovalId: args.preapprovalId,
      initPoint: args.initPoint,
      trialDays: args.trialDays,
      leaseExpiresAt: now,
      updatedAt: now,
    });
  },
});

export const clear = zInternalMutation({
  args: z.object({
    userId: z.string(),
    preapprovalId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const attempt = await ctx.db
      .query("mercadopagoCheckoutAttempts")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (
      attempt &&
      (!args.preapprovalId || attempt.preapprovalId === args.preapprovalId)
    ) {
      await ctx.db.delete(attempt._id);
    }
  },
});
