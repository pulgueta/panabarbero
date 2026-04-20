import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "@tanstack/react-query";

export function recentNotificationsQueryOptions() {
  return convexQuery(api.notifications.listRecent, {});
}

export function unreadNotificationsCountQueryOptions() {
  return convexQuery(api.notifications.unreadCount, {});
}

export function notificationsPageQueryOptions(opts: {
  cursor: string | null;
  numItems: number;
}) {
  return convexQuery(api.notifications.list, {
    paginationOpts: opts,
  });
}

/** Live-updating list of the 5 most recent notifications for the current user. */
export function useRecentNotifications() {
  return useQuery(recentNotificationsQueryOptions());
}

/** Live-updating count of unread notifications for the header bell. */
export function useUnreadNotificationsCount() {
  return useQuery(unreadNotificationsCountQueryOptions());
}

export function useNotificationsPage(opts: {
  cursor: string | null;
  numItems: number;
}) {
  return useQuery(notificationsPageQueryOptions(opts));
}

export function useNotificationActions() {
  const markReadMutation = useMutation({
    mutationFn: useConvexMutation(api.notifications.markRead),
  });
  const markAllReadMutation = useMutation({
    mutationFn: useConvexMutation(api.notifications.markAllRead),
  });

  return { markReadMutation, markAllReadMutation };
}
