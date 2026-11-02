import { api } from "@panabarbero/backend/convex/_generated/api";
import {
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";

const PAGE_SIZE = 20;

/** The current user's inbox, newest first, paginated. */
export function useNotificationsFeed() {
  const { isAuthenticated } = useConvexAuth();
  return usePaginatedQuery(
    api.inAppNotifications.list,
    isAuthenticated ? {} : "skip",
    { initialNumItems: PAGE_SIZE },
  );
}

/** Unread count for the tab badge. `undefined` while loading. */
export function useUnreadCount() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.inAppNotifications.unreadCount,
    isAuthenticated ? {} : "skip",
  );
}

/**
 * Read watermark: a row is unread when `_creationTime > lastRead`.
 * `undefined` while loading, `null` when nothing was read yet.
 */
export function useLastRead() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.inAppNotifications.getLastRead,
    isAuthenticated ? {} : "skip",
  );
}

/** Moves the read watermark to now. */
export function useMarkAllRead() {
  return useMutation(api.inAppNotifications.markAllRead);
}
