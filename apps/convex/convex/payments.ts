import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tables } from "./tables";

export const createPayment = mutation({
  args: {
    payment: v.object({
      ...tables.payments,
    }),
  },
  handler: async (ctx, args) => {
    const paymentId = await ctx.db.insert("payments", args.payment);
    return paymentId;
  },
});

export const getPaymentsByAppointmentId = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .filter(({ eq, field }) => eq(field("appointmentId"), args.appointmentId))
      .withIndex("by_appointmentId")
      .collect();

    return payments;
  },
});

export const getPaymentByTransactionId = query({
  args: { transactionId: v.string() },
  handler: async (ctx, args) => {
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
    const updated = await ctx.db.patch(args.paymentId, args.payment);

    return updated;
  },
});

export const deletePayment = mutation({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.paymentId);
  },
});
