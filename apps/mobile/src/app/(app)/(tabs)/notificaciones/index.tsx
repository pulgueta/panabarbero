import type { Doc } from "@panabarbero/backend/convex/_generated/dataModel";
import { useFocusEffect, useRouter } from "expo-router";
import { Button, Separator, Spinner, Typography } from "heroui-native";
import { useCallback, useEffect, useRef } from "react";
import { FlatList, type ListRenderItemInfo, View } from "react-native";

import {
  NotificationRow,
  NotificationRowSkeleton,
} from "@/components/notifications/notification-row";
import { ScreenHeader } from "@/components/screen-header";
import {
  useLastRead,
  useMarkAllRead,
  useNotificationsFeed,
  useUnreadCount,
} from "@/hooks/use-notifications";
import { notificationHrefForData } from "@/lib/push";

const PAGE_SIZE = 20;
const skeletonKeys = ["a", "b", "c", "d", "e"];

type Notification = Doc<"inAppNotifications">;

export default function NotificationsScreen() {
  const router = useRouter();
  const { results, status, loadMore } = useNotificationsFeed();
  const unreadCount = useUnreadCount() ?? 0;
  const lastRead = useLastRead();
  const markAllRead = useMarkAllRead();

  // Read through a ref so the focus effect does not re-run (and mark read)
  // every time the count changes while the tab is open.
  const unreadRef = useRef(unreadCount);
  useEffect(() => {
    unreadRef.current = unreadCount;
  }, [unreadCount]);

  // Mark read on blur: unread styling stays while the user reads, and the
  // badge clears once they leave the tab.
  useFocusEffect(
    useCallback(
      () => () => {
        if (unreadRef.current > 0) void markAllRead();
      },
      [markAllRead],
    ),
  );

  const openNotification = useCallback(
    (notification: Notification) =>
      router.push(
        notificationHrefForData({
          kind: notification.kind,
          ...notification.payload,
        }),
      ),
    [router],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Notification>) => (
      <NotificationRow
        notification={item}
        // Wait for the watermark so rows do not flash as unread.
        isUnread={
          lastRead !== undefined && item._creationTime > (lastRead ?? 0)
        }
        onOpen={openNotification}
      />
    ),
    [lastRead, openNotification],
  );

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Notificaciones"
        action={
          unreadCount > 0 ? (
            <Button variant="ghost" size="sm" onPress={() => markAllRead()}>
              Marcar leídas
            </Button>
          ) : null
        }
      />

      {status === "LoadingFirstPage" ? (
        <View>
          {skeletonKeys.map((key) => (
            <NotificationRowSkeleton key={key} />
          ))}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(notification) => notification._id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <Separator className="mx-5" />}
          onEndReached={() => {
            if (status === "CanLoadMore") loadMore(PAGE_SIZE);
          }}
          ListFooterComponent={
            status === "LoadingMore" ? (
              <View className="items-center py-6">
                <Spinner size="sm" />
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <Typography.Paragraph
              color="muted"
              className="px-5 py-10 text-center"
            >
              Sin notificaciones por ahora.
            </Typography.Paragraph>
          }
        />
      )}
    </View>
  );
}
