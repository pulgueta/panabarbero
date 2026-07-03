import { cronJobs } from "convex/server";
import { z } from "zod";

import { zInternalMutation } from ".";
import { internal } from "./_generated/api";

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

    await Promise.all(
      appointments.map((appointment) => ctx.db.delete(appointment._id)),
    );
  },
});

crons.interval(
  "Sync existing products from Polar",
  { hours: 24 },
  internal.polar.syncExistingProducts,
);

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
  "Rollup old inventory movements",
  { hours: 24 * 7 },
  internal.inventory.rollupOldMovements,
);

export default crons;
