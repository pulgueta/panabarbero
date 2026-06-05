import { cronJobs } from "convex/server";
import { z } from "zod";

import { zInternalMutation } from ".";
import { components, internal } from "./_generated/api";
import { invites } from "./invitations";

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

export const cleanupOldInvitations = zInternalMutation({
  args: z.object({}),
  handler: async (ctx) => {
    // Delete claimed/revoked/expired invites managed by the invite-links
    // component. Active (pending) invites are left untouched.
    await invites.deleteOldInvites(ctx, { olderThanMs: ONE_WEEK_MS });
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
