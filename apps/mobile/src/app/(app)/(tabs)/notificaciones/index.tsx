import type { Doc } from "@panabarbero/backend/convex/_generated/dataModel";
import { useFocusEffect, useRouter } from "expo-router";
import { Spinner, Typography, useThemeColor } from "heroui-native";
import { BellSimpleIcon, CheckCircleIcon } from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SectionList,
  type SectionListRenderItemInfo,
  View,
} from "react-native";

import { HeaderAction } from "@/components/header-action";
import {
  NotificationRow,
  NotificationRowSkeleton,
} from "@/components/notifications/notification-row";
import { EmptyState } from "@/components/ui/empty-state";
import {
  type Segment,
  SegmentedControl,
} from "@/components/ui/segmented-control";
import {
  useLastRead,
  useMarkAllRead,
  useNotificationsFeed,
  useUnreadCount,
} from "@/hooks/use-notifications";
import { formatDayGroup, localStartOfDay } from "@/lib/dates";
import { notificationHrefForData } from "@/lib/push";

const PAGE_SIZE = 20;
const skeletonKeys = ["a", "b", "c", "d", "e"];
const sectionTitle = { fontSize: 12, lineHeight: 16 };

type Notification = Doc<"inAppNotifications">;
type InboxFilter = "all" | "unread" | "read";
type DaySection = { dayMs: number; title: string; data: Notification[] };

const FILTERS: Segment<InboxFilter>[] = [
  { value: "all", label: "Todas" },
  { value: "unread", label: "No leídas" },
  { value: "read", label: "Leídas" },
];

/** Rounds the corners of a row that touches the card edge. */
function rowCorners(index: number, count: number) {
  const top = index === 0 ? "rounded-t-[20px]" : "";
  const bottom = index === count - 1 ? "rounded-b-[20px]" : "";
  return `${top} ${bottom}`;
}

/** Newest-first rows into one section per device-local day. */
function groupByDay(notifications: Notification[]): DaySection[] {
  const todayMs = localStartOfDay(Date.now());
  const sections: DaySection[] = [];
  for (const notification of notifications) {
    const dayMs = localStartOfDay(notification._creationTime);
    const last = sections[sections.length - 1];
    if (last?.dayMs === dayMs) {
      last.data.push(notification);
    } else {
      sections.push({
        dayMs,
        title: formatDayGroup(dayMs, todayMs),
        data: [notification],
      });
    }
  }
  return sections;
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

  // Wait for the watermark so rows do not flash as unread (or as read).
  const isUnread = useCallback(
    (notification: Notification) =>
      lastRead !== undefined && notification._creationTime > (lastRead ?? 0),
    [lastRead],
  );
  const isRead = useCallback(
    (notification: Notification) =>
      lastRead !== undefined && notification._creationTime <= (lastRead ?? 0),
    [lastRead],
  );

  const isLoadingFirstPage = status === "LoadingFirstPage";
  const sections = useMemo(() => {
    if (isLoadingFirstPage) return [];
    const rows =
      filter === "unread"
        ? results.filter(isUnread)
        : filter === "read"
          ? results.filter(isRead)
          : results;
    return groupByDay(rows);
  }, [filter, isLoadingFirstPage, isRead, isUnread, results]);

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
    ({
      item,
      index,
      section,
    }: SectionListRenderItemInfo<Notification, DaySection>) => (
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
        className={rowCorners(index, section.data.length)}
      />
    ),
    [isUnread, openId, openNotification],
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
          SectionList does not drive the tab bar minimize-on-scroll; accepted. */}
      <SectionList
        className="flex-1 bg-background"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="mx-4 mt-2 mb-4 rounded-[28px] bg-agenda-well p-2"
        sections={sections}
        extraData={openId}
        keyExtractor={(notification) => notification._id}
        renderItem={renderItem}
        // The well tone paints the header, so rows slide under it when it sticks.
        renderSectionHeader={({ section }) => (
          <View className="bg-agenda-well px-3 pt-3 pb-2">
            <Typography weight="medium" color="muted" style={sectionTitle}>
              {section.title}
            </Typography>
          </View>
        )}
        // Scrolling counts as tapping outside: the open row closes.
        onScrollBeginDrag={() => setOpenId(null)}
        ListHeaderComponent={
          <View className="items-center pt-1">
            <SegmentedControl
              segments={FILTERS}
              value={filter}
              onChange={setFilter}
            />
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
          <View className="mt-3 rounded-[20px] bg-agenda-card">
            {isLoadingFirstPage ? (
              skeletonKeys.map((key) => <NotificationRowSkeleton key={key} />)
            ) : filter === "unread" ? (
              <EmptyState
                icon={<CheckCircleIcon size={18} color={muted} />}
                title="Todo leído"
                description="No tienes notificaciones sin leer."
                action={{ label: "Ver todas", onPress: () => setFilter("all") }}
              />
            ) : filter === "read" ? (
              <EmptyState
                icon={<BellSimpleIcon size={18} color={muted} />}
                title="Sin notificaciones leídas"
                description="Las que ya leíste aparecerán aquí."
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
