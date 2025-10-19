import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { tables } from "./tables";

export const createPayment = mutation({
  args: {
    payment: v.object({
      ...tables.payments,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const paymentId = await ctx.db.insert("payments", {
      ...args.payment,
      uuid: crypto.randomUUID(),
    });

    return paymentId;
  },
});

export const getPaymentsByAppointmentId = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_appointmentId")
      .filter(({ eq, field }) => eq(field("appointmentId"), args.appointmentId))
      .collect();

    return payments;
  },
});

export const getPaymentByTransactionId = query({
  args: { transactionId: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const payment = await ctx.db
      .query("payments")
      .filter(({ eq, field }) => eq(field("transactionId"), args.transactionId))
      .unique();

    return payment;
  },
});

export const updatePayment = mutation({
  args: {
    paymentId: v.id("payments"),
    payment: v.object({ ...tables.payments }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const updated = await ctx.db.patch(args.paymentId, args.payment);

    return updated;
  },
});

export const deletePayment = mutation({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    await ctx.db.delete(args.paymentId);
  },
});
