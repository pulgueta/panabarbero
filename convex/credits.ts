/**
 * Extra credit management — mutations for webhook processing and queries
 * for the UI balance display.
 */

import { ConvexError } from "convex/values";
import { z } from "zod";
import { zInternalMutation, zQuery } from ".";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getUsageRow, getUserPlanLimits } from "./acl";
import { authComponent } from "./auth";
import { assertShopRole } from "./authz";
import { errorMessages } from "./errors";
import { getCurrentYearMonth } from "./plans";
import { barbershops } from "./schema";

export async function getExtraCredits(
  ctx: QueryCtx | MutationCtx,
  barbershopId: Id<"barbershops">,
) {
  return ctx.db
    .query("extraCredits")
    .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
    .unique();
}

/**
 * Idempotently adds purchased credits for a barbershop.
 * Returns `false` if the order was already processed (deduplicated).
 */
export const addPurchasedCredits = zInternalMutation({
  args: z.object({
    orderId: z.string(),
    barbershopId: barbershops.tools.id.shape.id,
    type: z.enum(["sms", "email"]),
    amount: z.number(),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("creditPurchases")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .unique();

    if (existing) {
      return false;
    }

    const barbershop = await ctx.db.get(args.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    const barbershopId = barbershop._id;

    await ctx.db.insert("creditPurchases", {
      orderId: args.orderId,
      barbershopId: args.barbershopId,
      type: args.type,
      amount: args.amount,
      purchasedAt: Date.now(),
    });

    const row = await getExtraCredits(ctx, barbershopId);

    if (row) {
      if (args.type === "sms") {
        await ctx.db.patch(row._id, {
          smsCredits: row.smsCredits + args.amount,
        });
      } else {
        await ctx.db.patch(row._id, {
          emailCredits: row.emailCredits + args.amount,
        });
      }
    } else {
      await ctx.db.insert("extraCredits", {
        barbershopId,
        smsCredits: args.type === "sms" ? args.amount : 0,
        emailCredits: args.type === "email" ? args.amount : 0,
      });
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
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      return null;
    }

    const userId = user.userId;

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
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      return null;
    }

    const barbershop = await ctx.db.get(args.id);

    if (!barbershop) {
      return null;
    }

    await assertShopRole(ctx, args.id, user.userId, [
      "barber",
      "owner",
      "staff",
    ]);

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
