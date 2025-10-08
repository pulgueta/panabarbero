import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const runReminderScan = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const startAtGte = now + 29 * 60 * 1000;
    const startAtLte = now + 31 * 60 * 1000;
    const appts = await ctx.db
      .query("appointments")
      .withIndex("by_startAt")
      .filter(({ gte, lte, field, and, or, eq }) =>
        and(
          gte(field("startAt"), startAtGte),
          lte(field("startAt"), startAtLte),
          or(eq(field("status"), "pending"), eq(field("status"), "confirmed")),
        ),
      )
      .collect();
    for (const appt of appts) {
      await ctx.db.insert("notifications", {
        uuid: crypto.randomUUID(),
        type: "sms",
        reason: "appointment_reminder",
        title: "Upcoming appointment",
        body: "Reminder: your appointment starts in ~30 minutes.",
        senderUserId: "system",
        receiverUserId: appt.userId,
        appointmentId: appt._id,
      });
    }
    return null;
  },
});

export const runGraceNoShowScan = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const appts = await ctx.db
      .query("appointments")
      .withIndex("by_startAt")
      .filter(({ lte, field, or, eq, and }) =>
        and(
          lte(field("startAt"), now),
          or(eq(field("status"), "pending"), eq(field("status"), "confirmed")),
        ),
      )
      .collect();
    for (const appt of appts) {
      const shop = await ctx.db.get(appt.barbershopId);
      const grace = shop?.gracePeriodMinutes ?? 0;
      const cutoff = appt.startAt + grace * 60 * 1000;
      if (Date.now() >= cutoff) {
        await ctx.db.patch(appt._id, { status: "no-show" });
        await ctx.db.insert("notifications", {
          uuid: crypto.randomUUID(),
          type: "sms",
          reason: "appointment_no_show",
          title: "Marked as no-show",
          body: "You were marked as no-show after the grace period.",
          senderUserId: "system",
          receiverUserId: appt.userId,
          appointmentId: appt._id,
        });
      }
    }
    return null;
  },
});

// Only two internal mutations are needed for crons
