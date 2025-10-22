import { cronJobs } from "convex/server";
import { components, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const crons = cronJobs();

crons.interval(
  "Remove old emails from the Resend component",
  { hours: 24 },
  internal.crons.cleanupResend,
);

crons.interval(
  "Delete user profiles for deleted users",
  { hours: 24 * 7 },
  internal.crons.deleteUserProfiles,
);

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const cleanupResend = internalMutation({
  args: {},
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

export const deleteUserProfiles = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId")
      .filter(({ eq, field }) => eq(field("userId"), null))
      .collect();

    for (const user of users) {
      await ctx.db.delete(user._id);
    }
  },
});

export default crons;
