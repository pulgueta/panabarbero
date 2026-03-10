import { cronJobs } from "convex/server";
import { z } from "zod";

import { zInternalMutation } from ".";
import { components, internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Remove old emails from the resend component",
  { hours: 24 * 7 },
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

export const cleanupOldInvitations = zInternalMutation({
  args: z.object({}),
  handler: async (ctx) => {
    const now = Date.now();

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_expiresAt", (q) => q.lte("expiresAt", now))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "expired"),
          q.eq(q.field("status"), "accepted"),
          q.eq(q.field("status"), "denied"),
        ),
      )
      .collect();

    for (const invitation of invitations) {
      await ctx.db.delete(invitation._id);
    }
  },
});

export const cleanupExpiredSessions = zInternalMutation({
  args: z.object({}),
  handler: async (ctx) => {
    const now = Date.now();

    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "session",
        where: [
          {
            field: "expiresAt",
            value: now,
            operator: "lt",
          },
        ],
      },
      paginationOpts: {
        cursor: null,
        numItems: 100,
      },
    });
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
  "Cleanup old invitations",
  { hours: 24 * 7 },
  internal.crons.cleanupOldInvitations,
);

crons.interval(
  "Cleanup expired sessions",
  { hours: 24 * 7 },
  internal.crons.cleanupExpiredSessions,
);

export default crons;
