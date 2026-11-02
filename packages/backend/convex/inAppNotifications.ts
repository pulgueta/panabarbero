import { paginationOptsValidator } from "convex/server";
import { convexToZod } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zAuthMutation, zAuthQuery, zInternalMutation } from ".";
import { unreads } from "./notifications";

const INBOX_RECENT_LIMIT = 5;
/** Clients show "99+" above 99, so counting past 100 rows buys nothing. */
const UNREAD_COUNT_CAP = 100;

/** Most recent 5 notifications for the current user. Used by the header popover. */
export const listRecent = zAuthQuery({
  args: z.object({}),
  handler: async (ctx) => {
    const { userId } = ctx;

    return await ctx.db
      .query("inAppNotifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(INBOX_RECENT_LIMIT);
  },
});

/** Paginated notifications list for the profile "Notificaciones" tab. */
export const list = zAuthQuery({
  args: z.object({
    paginationOpts: convexToZod(paginationOptsValidator),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    return await ctx.db
      .query("inAppNotifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/** Paginated unread notifications for the "Sin leer" tab in the profile inbox. */
export const listUnread = zAuthQuery({
  args: z.object({
    paginationOpts: convexToZod(paginationOptsValidator),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    const lastRead = await unreads.getLastRead(ctx, {
      userId,
      channelId: userId,
    });

    return await ctx.db
      .query("inAppNotifications")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", userId).gt("_creationTime", lastRead ?? 0),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

/**
 * Count of notifications the current user has not yet read. Used for the bell
 * badge. Counts inbox rows above the read watermark, the same rule as
 * `listUnread` and `getLastRead`, so the badge always matches the rows shown
 * as unread. (The component's own count only sees rows it has a `messages`
 * entry for; the 90-day cleanup prunes those while the rows stay.)
 */
export const unreadCount = zAuthQuery({
  args: z.object({}),
  handler: async (ctx) => {
    const { userId } = ctx;

    const lastRead = await unreads.getLastRead(ctx, {
      userId,
      channelId: userId,
    });

    const rows = await ctx.db
      .query("inAppNotifications")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", userId).gt("_creationTime", lastRead ?? 0),
      )
      .take(UNREAD_COUNT_CAP);

    return rows.length;
  },
});

/**
 * Read watermark for the current user's inbox. Rows with `_creationTime`
 * greater than this are unread — used by the client for per-row styling.
 */
export const getLastRead = zAuthQuery({
  args: z.object({}),
  handler: async (ctx) => {
    const { userId } = ctx;

    return await unreads.getLastRead(ctx, {
      userId,
      channelId: userId,
    });
  },
});

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/** Daily cron target: prune unread-tracking bookkeeping older than 90 days. */
export const cleanupUnreads = zInternalMutation({
  args: z.object({}),
  handler: async (ctx) => {
    await unreads.cleanup(ctx, { olderThanMs: NINETY_DAYS_MS });
  },
});

/** Mark every notification belonging to the current user as read. */
export const markAllRead = zAuthMutation({
  args: z.object({}),
  handler: async (ctx) => {
    const { userId } = ctx;

    await unreads.markReadUpTo(ctx, {
      userId,
      channelId: userId,
      timestamp: Date.now(),
    });
  },
});
