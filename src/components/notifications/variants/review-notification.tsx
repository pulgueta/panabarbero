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

  const uuid = notification.payload?.barbershopUuid;
  const code = notification.payload?.reviewCode;
  const action =
    kind === "review_invite" && uuid && code
      ? {
          to: `/barbershops/${uuid}/review`,
          search: { code },
        }
      : { to: "/profile", search: { tab: "reviews" } };

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
