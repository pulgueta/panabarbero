import { StarIcon, WarningCircleIcon } from "@phosphor-icons/react";
import type { FC } from "react";

import { NotificationItem } from "@/components/notifications/notification-item";
import { formatRelativeTime } from "@/components/notifications/relative-time";

import type { VariantBaseProps } from "./appointment-notification";

const config = {
  review_invite: {
    tone: "primary" as const,
    icon: <StarIcon weight="duotone" />,
    actionLabel: "Dejar reseña",
  },
  review_needs_attention: {
    tone: "warning" as const,
    icon: <WarningCircleIcon weight="duotone" />,
    actionLabel: "Revisar",
  },
};

export const ReviewNotification: FC<
  VariantBaseProps & { kind: keyof typeof config }
> = ({
  notification,
  density,
  isUnread,
  onSelect,
  kind,
  usesBarberCalendar: _usesBarberCalendar,
}) => {
  const { tone, icon, actionLabel } = config[kind];

  // Both kinds land on the profile "Reseñas" tab: the code-gated review route
  // is gone, and historical `review_invite` rows must not 404.
  const action = { to: "/profile", search: { tab: "reviews" } };

  return (
    <NotificationItem
      notification={notification}
      density={density}
      isUnread={isUnread}
      onSelect={onSelect}
    >
      <NotificationItem.Icon icon={icon} tone={tone} />
      <NotificationItem.Body>
        <NotificationItem.Title>{notification.title}</NotificationItem.Title>
        <NotificationItem.Description>
          {notification.description}
        </NotificationItem.Description>
        <NotificationItem.Meta>
          {formatRelativeTime(notification._creationTime)}
        </NotificationItem.Meta>
      </NotificationItem.Body>
      <NotificationItem.Action to={action.to} search={action.search}>
        {actionLabel}
      </NotificationItem.Action>
    </NotificationItem>
  );
};
