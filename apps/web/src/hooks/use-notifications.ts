import { api } from "@convex/_generated/api";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

export function recentNotificationsQueryOptions() {
  return convexQuery(api.inAppNotifications.listRecent, {});
}

export function unreadNotificationsCountQueryOptions() {
  return convexQuery(api.inAppNotifications.unreadCount, {});
}

export function lastReadQueryOptions() {
  return convexQuery(api.inAppNotifications.getLastRead, {});
}

export function notificationsPageQueryOptions(opts: {
  cursor: string | null;
  numItems: number;
}) {
  return convexQuery(api.inAppNotifications.list, {
    paginationOpts: opts,
  });
}

export function unreadNotificationsPageQueryOptions(opts: {
  cursor: string | null;
  numItems: number;
}) {
  return convexQuery(api.inAppNotifications.listUnread, {
    paginationOpts: opts,
  });
}

/** Live-updating list of the 5 most recent notifications for the current user. */
export function useRecentNotifications() {
  return useSuspenseQuery(recentNotificationsQueryOptions());
}

/** Live-updating count of unread notifications for the header bell. */
export function useUnreadNotificationsCount() {
  return useSuspenseQuery(unreadNotificationsCountQueryOptions());
}

/** Read watermark: a row is unread iff `_creationTime > (lastRead ?? 0)`. */
export function useLastRead() {
  return useSuspenseQuery(lastReadQueryOptions());
}

export function useNotificationsPage(opts: {
  cursor: string | null;
  numItems: number;
}) {
  return useSuspenseQuery(notificationsPageQueryOptions(opts));
}

export function useUnreadNotificationsPage(opts: {
  cursor: string | null;
  numItems: number;
}) {
  return useSuspenseQuery(unreadNotificationsPageQueryOptions(opts));
}

export function useNotificationActions() {
  const markAllReadMutation = useMutation({
    mutationFn: useConvexMutation(api.inAppNotifications.markAllRead),
  });

  return { markAllReadMutation };
}
