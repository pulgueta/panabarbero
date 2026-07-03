import { PackageIcon } from "@phosphor-icons/react";
import type { FC } from "react";

import { NotificationItem } from "@/components/notifications/notification-item";
import { formatRelativeTime } from "@/components/notifications/relative-time";

import type { VariantBaseProps } from "./appointment-notification";

/** Low-stock alerts for shop owners: warning tone, deep link to inventory. */
export const InventoryNotification: FC<VariantBaseProps> = ({
  notification,
  density,
  isUnread,
  onSelect,
  usesBarberCalendar: _usesBarberCalendar,
}) => {
  return (
    <NotificationItem
      notification={notification}
      density={density}
      isUnread={isUnread}
      onSelect={onSelect}
    >
      <NotificationItem.Icon
        icon={<PackageIcon weight="duotone" />}
        tone="warning"
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
      <NotificationItem.Action to="/profile/barbershops/inventory">
        Reabastecer
      </NotificationItem.Action>
    </NotificationItem>
  );
};
