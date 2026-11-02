import type { Doc } from "@panabarbero/backend/convex/_generated/dataModel";
import { useFocusEffect, useRouter } from "expo-router";
import { Spinner, useThemeColor } from "heroui-native";
import { BellSimpleIcon, CheckCircleIcon } from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, type ListRenderItemInfo, View } from "react-native";

import { HeaderAction } from "@/components/header-action";
import {
  type InboxFilter,
  InboxFilterPill,
} from "@/components/notifications/inbox-filter";
import {
  NotificationRow,
  NotificationRowSkeleton,
} from "@/components/notifications/notification-row";
import { EmptyState } from "@/components/ui/empty-state";
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

/** Rounds the corners of a row that touches the card edge. */
function rowCorners(index: number, count: number) {
  const top = index === 0 ? "rounded-t-[20px]" : "";
  const bottom = index === count - 1 ? "rounded-b-[20px]" : "";
  return `${top} ${bottom}`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [muted] = useThemeColor(["muted"]);
  const { results, status, loadMore } = useNotificationsFeed();
  const unreadCount = useUnreadCount() ?? 0;
  const lastRead = useLastRead();
  const markAllRead = useMarkAllRead();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [openId, setOpenId] = useState<Notification["_id"] | null>(null);

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

  // Wait for the watermark so rows do not flash as unread.
  const isUnread = useCallback(
    (notification: Notification) =>
      lastRead !== undefined && notification._creationTime > (lastRead ?? 0),
    [lastRead],
  );

  const isLoadingFirstPage = status === "LoadingFirstPage";
  const data = useMemo(() => {
    if (isLoadingFirstPage) return [];
    return filter === "unread" ? results.filter(isUnread) : results;
  }, [filter, isLoadingFirstPage, isUnread, results]);

  // A tap while another row is open only closes that row.
  const openNotification = useCallback(
    (notification: Notification) => {
      if (openId !== null && openId !== notification._id) {
        setOpenId(null);
        return;
      }
      router.push(
        notificationHrefForData({
          kind: notification.kind,
          ...notification.payload,
        }),
      );
    },
    [openId, router],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Notification>) => (
      <NotificationRow
        notification={item}
        isUnread={isUnread(item)}
        isOpen={openId === item._id}
        onOpenChange={(isOpen) =>
          setOpenId((current) =>
            isOpen ? item._id : current === item._id ? null : current,
          )
        }
        onOpen={openNotification}
        className={rowCorners(index, data.length)}
      />
    ),
    [data.length, isUnread, openId, openNotification],
  );

  return (
    <>
      <HeaderAction
        label="Marcar leídas"
        icon="checkmark.circle"
        disabled={unreadCount === 0}
        onPress={() => markAllRead()}
      />
      {/* The list is the first view so rows run under the glass header. A
          FlatList does not drive the tab bar minimize-on-scroll; accepted. */}
      <FlatList
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="mx-4 mt-2 mb-4 rounded-[28px] bg-agenda-well p-2"
        data={data}
        extraData={openId}
        keyExtractor={(notification) => notification._id}
        renderItem={renderItem}
        // Scrolling counts as tapping outside: the open row closes.
        onScrollBeginDrag={() => setOpenId(null)}
        ListHeaderComponent={
          <View className="pt-1 pb-3">
            <InboxFilterPill value={filter} onChange={setFilter} />
          </View>
        }
        ItemSeparatorComponent={() => (
          // Inset to the text column: 16 pt padding + 36 pt well + 12 pt gap.
          <View className="bg-agenda-card">
            <View className="ml-16 h-px bg-separator" />
          </View>
        )}
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
          <View className="rounded-[20px] bg-agenda-card">
            {isLoadingFirstPage ? (
              skeletonKeys.map((key) => <NotificationRowSkeleton key={key} />)
            ) : filter === "unread" ? (
              <EmptyState
                icon={<CheckCircleIcon size={18} color={muted} />}
                title="Todo leído"
                description="No tienes notificaciones sin leer."
                action={{ label: "Ver todas", onPress: () => setFilter("all") }}
              />
            ) : (
              <EmptyState
                icon={<BellSimpleIcon size={18} color={muted} />}
                title="Sin notificaciones"
                description="Cuando pase algo con tus citas, lo verás aquí."
              />
            )}
          </View>
        }
      />
    </>
  );
}
