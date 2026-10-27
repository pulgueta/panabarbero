import type { Doc } from "@panabarbero/backend/convex/_generated/dataModel";
import { Skeleton, Typography } from "heroui-native";
import { Pressable, View } from "react-native";

import { formatRelativeTime } from "@/lib/relative-time";

const tabularNums = { fontVariant: ["tabular-nums" as const] };

type NotificationRowProps = {
  notification: Doc<"inAppNotifications">;
  isUnread: boolean;
  onOpen: (notification: Doc<"inAppNotifications">) => void;
};

export function NotificationRow({
  notification,
  isUnread,
  onOpen,
}: NotificationRowProps) {
  return (
    <Pressable
      onPress={() => onOpen(notification)}
      accessibilityRole="button"
      accessibilityHint={isUnread ? "No leída" : undefined}
      className="flex-row items-start gap-3 px-5 py-3 active:bg-surface-secondary"
    >
      {/* Fixed slot so read and unread titles stay aligned. */}
      <View className="w-2 pt-2">
        {isUnread ? <View className="size-2 rounded-full bg-accent" /> : null}
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-start gap-3">
          <Typography weight="semibold" className="flex-1">
            {notification.title}
          </Typography>
          <Typography.Paragraph
            type="body-xs"
            color="muted"
            className="pt-0.5"
            style={tabularNums}
          >
            {formatRelativeTime(notification._creationTime)}
          </Typography.Paragraph>
        </View>
        <Typography.Paragraph type="body-sm" color="muted" numberOfLines={2}>
          {notification.description}
        </Typography.Paragraph>
      </View>
    </Pressable>
  );
}

export function NotificationRowSkeleton() {
  return (
    <View className="flex-row items-start gap-3 px-5 py-3">
      <View className="w-2" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-4 w-40 rounded-md" />
        <Skeleton className="h-3 w-56 rounded-md" />
      </View>
    </View>
  );
}
