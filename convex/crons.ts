import { cronJobs } from "convex/server";
import { z } from "zod";

import { zInternalMutation } from ".";
import { components, internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Remove old emails from the resend component",
  { hours: 1 },
  internal.crons.cleanupResend,
);

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const cleanupResend = zInternalMutation({
  args: z.object({}),
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(0, components.resend.lib.cleanupOldEmails, {
      olderThan: ONE_WEEK_MS,
    });
    await ctx.scheduler.runAfter(
      0,
      components.resend.lib.cleanupAbandonedEmails,
      { olderThan: 4 * ONE_WEEK_MS },
    );
  },
});

export const cleanupAppointments = zInternalMutation({
  args: z.object({}),
  handler: async (ctx) => {
    const now = Date.now();

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_deletedAt", (q) => q.lte("deletedAt", now))
      .filter((q) =>
        q.and(
          q.and(
            q.not(q.eq(q.field("deletedAt"), undefined)),
            q.lte(q.field("deletedAt"), now),
          ),
          q.eq(q.field("status"), "cancelled"),
        ),
      )
      .collect();

    for (const appointment of appointments) {
      await ctx.db.delete(appointment._id);
    }
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

export default crons;
