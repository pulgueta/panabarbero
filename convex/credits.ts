/**
 * Extra credit management — mutations for webhook processing and queries
 * for the UI balance display.
 */

import { z } from "zod";
import { zInternalMutation, zQuery } from ".";
import { getExtraCredits, getUsageRow, getUserPlanLimits } from "./acl";
import { assertShopRole } from "./authz";
import { getUserId } from "./identity";
import { getCurrentYearMonth } from "./plans";
import { barbershops } from "./schema";

/**
 * Idempotently adds purchased credits to the payer's barbershop. The payer is
 * identified by the server-set `metadata.userId` on the Polar order — never a
 * client-supplied barbershop id. Returns `false` when the order was already
 * processed or the payer no longer owns a barbershop; it never throws, so the
 * webhook does not retry a permanently unassignable order.
 */
export const addPurchasedCredits = zInternalMutation({
  args: z.object({
    orderId: z.string(),
    userId: z.string(),
    type: z.literal("whatsapp"),
    amount: z.number().min(1),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("creditPurchases")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .unique();

    if (existing) {
      return false;
    }

    const barbershop = await ctx.db
      .query("barbershops")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.userId))
      .first();

    if (!barbershop) {
      console.error(
        `[polar] orden ${args.orderId}: el pagador ${args.userId} no tiene barbería — créditos no acreditados`,
      );
      return false;
    }

    const barbershopId = barbershop._id;

    await ctx.db.insert("creditPurchases", {
      orderId: args.orderId,
      barbershopId,
      type: args.type,
      amount: args.amount,
      purchasedAt: Date.now(),
    });

    const row = await getExtraCredits(ctx, barbershopId);

    if (row) {
      await ctx.db.patch(row._id, {
        whatsappCredits: row.whatsappCredits + args.amount,
        whatsappPurchasedTotal: row.whatsappPurchasedTotal + args.amount,
      });
    } else {
      await ctx.db.insert("extraCredits", {
        barbershopId,
        whatsappCredits: args.amount,
        whatsappPurchasedTotal: args.amount,
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

    return await getExtraCredits(ctx, barbershop._id);
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
      whatsappUsed: row?.whatsappMessagesSent ?? 0,
      maxWhatsAppPerMonth: limits.maxWhatsAppPerMonth,
    };
  },
});
