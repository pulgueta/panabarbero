import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import type { FC } from "react";

import { NotificationItem } from "@/components/notifications/notification-item";
import { formatRelativeTime } from "@/components/notifications/relative-time";

import type { VariantBaseProps } from "./appointment-notification";

export const TeamInviteNotification: FC<VariantBaseProps> = ({
  notification,
  density,
  onMarkRead,
  onSelect,
  usesBarberCalendar: _usesBarberCalendar,
}) => {
  const code = notification.payload?.invitationCode;
  const href = code ? `/invitations/${code}` : "/profile";

  return (
    <NotificationItem
      notification={notification}
      density={density}
      onMarkRead={onMarkRead}
      onSelect={onSelect}
    >
      <NotificationItem.Icon
        icon={<EnvelopeSimpleIcon weight="duotone" />}
        tone="primary"
      />
      <NotificationItem.Body>
        <NotificationItem.Title>{notification.title}</NotificationItem.Title>
        <NotificationItem.Description>
          {notification.description}
        </NotificationItem.Description>
        <NotificationItem.Meta>
          {formatRelativeTime(notification._creationTime)}
        </NotificationItem.Meta>
      </NotificationItem.Body>
      <NotificationItem.Action to={href}>
        Abrir invitación
      </NotificationItem.Action>
    </NotificationItem>
  );
};
