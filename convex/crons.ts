import { cronJobs } from "convex/server";
import { z } from "zod";

import { zInternalMutation } from ".";
import { components, internal } from "./_generated/api";
import { completedAppointmentsAggregate } from "./aggregates";

const crons = cronJobs();

export const cleanupAppointments = zInternalMutation({
  args: z.object({}),
  handler: async (ctx) => {
    const now = Date.now();

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_deletedAt", (q) => q.lte("deletedAt", now))
      .filter((q) =>
        q.or(
          q.and(
            q.not(q.eq(q.field("deletedAt"), undefined)),
            q.lte(q.field("deletedAt"), now),
          ),
          q.eq(q.field("status"), "cancelled"),
          q.eq(q.field("status"), "no-show"),
          q.eq(q.field("status"), "denied"),
        ),
      )
      .collect();

    for (const appointment of appointments) {
      // Reviews are content and outlive their appointment (name snapshots by
      // design) — keep reviewed appointments so `reviews.appointmentId`
      // never dangles and no published rating is lost.
      const review = await ctx.db
        .query("reviews")
        .withIndex("by_appointmentId", (q) =>
          q.eq("appointmentId", appointment._id),
        )
        .first();

      if (review) {
        continue;
      }

      if (appointment.status === "completed") {
        await completedAppointmentsAggregate.deleteIfExists(ctx, {
          namespace: appointment.barbershopId,
          key: appointment.date,
          id: appointment._id,
        });
      }

      await ctx.db.delete(appointment._id);
    }
  },
});

export const cleanupUseSend = zInternalMutation({
  args: z.object({}),
  handler: async (ctx) => {
    await Promise.all([
      ctx.scheduler.runAfter(0, components.usesend.lib.cleanupOldEmails, {}),
      ctx.scheduler.runAfter(
        0,
        components.usesend.lib.cleanupAbandonedEmails,
        {},
      ),
    ]);
  },
});

crons.interval(
  "Cleanup soft-deleted appointments",
  { hours: 24 * 7 },
  internal.crons.cleanupAppointments,
);

crons.interval(
  "Cleanup unread-tracking data",
  { hours: 24 },
  internal.inAppNotifications.cleanupUnreads,
);

crons.interval(
  "Cleanup useSend email metadata",
  { hours: 24 },
  internal.crons.cleanupUseSend,
);

crons.interval(
  "Rollup old inventory movements",
  { hours: 24 * 7 },
  internal.inventory.rollupOldMovements,
);

export default crons;
