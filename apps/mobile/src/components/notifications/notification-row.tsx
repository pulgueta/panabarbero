import type { Doc } from "@panabarbero/backend/convex/_generated/dataModel";
import { Link } from "expo-router";
import { Chip, Skeleton, Typography, useThemeColor } from "heroui-native";
import {
  ArrowUpRightIcon,
  CalendarCheckIcon,
  CalendarDotsIcon,
  CalendarXIcon,
  EnvelopeSimpleIcon,
  type Icon,
  PackageIcon,
  StarIcon,
} from "phosphor-react-native";
import { Platform, View } from "react-native";

import { type SwipeAction, SwipeableRow } from "@/components/ui/swipeable-row";
import { formatLocalTime } from "@/lib/dates";
import { notificationHrefForData, notificationOpensScreen } from "@/lib/push";

const tabularNums = { fontVariant: ["tabular-nums" as const] };
const titleStyle = { fontSize: 14, lineHeight: 18 };
const bodyStyle = { fontSize: 13, lineHeight: 17 };
const timeStyle = { fontSize: 11, lineHeight: 14 };

type Notification = Doc<"inAppNotifications">;
type Kind = Notification["kind"];

/**
 * Kind families, mirroring the web `NotificationRenderer`. One icon per
 * family; a chip names the area when the kind has no mobile screen yet.
 */
const families = {
  appointment: { Icon: CalendarCheckIcon },
  cancellation: { Icon: CalendarXIcon },
  reschedule: { Icon: CalendarDotsIcon },
  review: { Icon: StarIcon, chip: "Reseña" },
  team: { Icon: EnvelopeSimpleIcon, chip: "Equipo" },
  inventory: { Icon: PackageIcon, chip: "Inventario" },
} satisfies Record<string, { Icon: Icon; chip?: string }>;

const familyByKind: Record<Kind, keyof typeof families> = {
  appointment_created: "appointment",
  barber_appointment_created: "appointment",
  appointment_reminder: "appointment",
  past_appointment_reminder: "appointment",
  customer_on_my_way: "appointment",
  appointment_reassigned: "appointment",
  appointment_cancelled: "cancellation",
  appointment_reschedule_denied: "cancellation",
  barber_removed_cancellation: "cancellation",
  service_deleted_cancellation: "cancellation",
  service_line_removed: "cancellation",
  appointment_reschedule_request: "reschedule",
  appointment_reschedule_accepted: "reschedule",
  team_invited: "team",
  review_invite: "review",
  review_needs_attention: "review",
  low_stock: "inventory",
};

type NotificationRowProps = {
  notification: Notification;
  isUnread: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onOpen: (notification: Notification) => void;
  /** Rounds the corners that touch the card edge. */
  className?: string;
};

export function NotificationRow({
  notification,
  isUnread,
  isOpen,
  onOpenChange,
  onOpen,
  className,
}: NotificationRowProps) {
  const [accent, muted, accentForeground] = useThemeColor([
    "accent",
    "muted",
    "accent-foreground",
  ]);
  const family = families[familyByKind[notification.kind]];
  const opensScreen = notificationOpensScreen(notification.kind);
  const open = () => onOpen(notification);
  // iOS lifts the row into a native context menu with a peek of the screen.
  const hasNativeMenu = opensScreen && Platform.OS === "ios";

  // No per-item mark-read mutation exists, so a right swipe has no action.
  const action: SwipeAction | undefined = opensScreen
    ? {
        label: "Abrir",
        icon: <ArrowUpRightIcon size={18} color={accentForeground} />,
        onPress: open,
        className: "bg-accent",
        textClassName: "text-accent-foreground",
      }
    : undefined;

  const row = (
    <SwipeableRow
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      action={action}
      // With a native menu the `Link` injects the tap handler instead.
      onPress={opensScreen && !hasNativeMenu ? open : undefined}
      accessibilityHint={isUnread ? "No leída" : undefined}
      className={className}
    >
      <View className="min-h-[64px] flex-row items-center gap-3 bg-agenda-card px-4 py-3">
        {/* Decorative: the SVG would otherwise read its package name. */}
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className={`size-9 items-center justify-center rounded-full ${
            isUnread ? "bg-accent-soft" : "bg-agenda-pill"
          }`}
        >
          <family.Icon size={18} color={isUnread ? accent : muted} />
        </View>
        <View className="flex-1 gap-0.5">
          <Typography weight="medium" style={titleStyle} numberOfLines={1}>
            {notification.title}
          </Typography>
          {/* A row with no screen behind it carries its whole message here. */}
          <Typography
            color="muted"
            style={bodyStyle}
            numberOfLines={opensScreen ? 1 : 3}
          >
            {notification.description}
          </Typography>
          {"chip" in family ? (
            <Chip
              size="sm"
              variant="soft"
              color="default"
              className="mt-1 self-start"
            >
              {family.chip}
            </Chip>
          ) : null}
        </View>
        <View className="items-end gap-1.5 self-start pt-0.5">
          <Typography
            className={isUnread ? "text-accent" : "text-muted"}
            style={[timeStyle, tabularNums]}
          >
            {formatLocalTime(notification._creationTime)}
          </Typography>
          {isUnread ? (
            <View className="size-1.5 rounded-full bg-accent" />
          ) : null}
        </View>
      </View>
    </SwipeableRow>
  );

  if (!hasNativeMenu) return row;

  // The native preview wrapper keeps its children out of the accessibility
  // tree, so the row's frame is the accessible element.
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${notification.title}. ${notification.description}`}
      accessibilityHint={isUnread ? "No leída" : undefined}
      accessibilityActions={[{ name: "activate", label: "Abrir" }]}
      onAccessibilityAction={open}
    >
      <Link
        href={notificationHrefForData({
          kind: notification.kind,
          ...notification.payload,
        })}
        asChild
        // The screen owns the tap (it may only close an open row), so the
        // link does not navigate by itself; the peek and the menu still do.
        onPress={(event) => {
          event.preventDefault();
          open();
        }}
      >
        <Link.Trigger>{row}</Link.Trigger>
        <Link.Preview />
        <Link.Menu>
          <Link.MenuAction icon="arrow.up.right" onPress={open}>
            Abrir
          </Link.MenuAction>
        </Link.Menu>
      </Link>
    </View>
  );
}

export function NotificationRowSkeleton() {
  return (
    <View className="min-h-[64px] flex-row items-center gap-3 px-4 py-3">
      <Skeleton className="size-9 rounded-full" />
      <View className="flex-1 gap-2">
        <Skeleton className="h-3.5 w-40 rounded-md" />
        <Skeleton className="h-3 w-56 rounded-md" />
      </View>
    </View>
  );
}
