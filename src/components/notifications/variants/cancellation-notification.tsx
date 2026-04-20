import {
  CalendarXIcon,
  UserMinusIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import type { FC } from "react";

import { getAppointmentHubLink } from "@/components/notifications/appointment-hub-link";
import { NotificationItem } from "@/components/notifications/notification-item";
import { formatRelativeTime } from "@/components/notifications/relative-time";

import type { VariantBaseProps } from "./appointment-notification";

const config = {
  appointment_cancelled: {
    tone: "destructive" as const,
    icon: <CalendarXIcon weight="duotone" />,
    actionLabel: "Ver citas",
  },
  appointment_reschedule_denied: {
    tone: "destructive" as const,
    icon: <WarningCircleIcon weight="duotone" />,
    actionLabel: "Ver detalles",
  },
  barber_removed_cancellation: {
    tone: "destructive" as const,
    icon: <UserMinusIcon weight="duotone" />,
    actionLabel: "Ver citas",
  },
  service_deleted_cancellation: {
    tone: "destructive" as const,
    icon: <WarningCircleIcon weight="duotone" />,
    actionLabel: "Ver citas",
  },
};

export const CancellationNotification: FC<
  VariantBaseProps & { kind: keyof typeof config }
> = ({
  notification,
  density,
  onMarkRead,
  onSelect,
  kind,
  usesBarberCalendar,
}) => {
  const { tone, icon, actionLabel } = config[kind];
  const link = getAppointmentHubLink(usesBarberCalendar);

  return (
    <NotificationItem
      notification={notification}
      density={density}
      onMarkRead={onMarkRead}
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
      <NotificationItem.Action to={link.to} search={link.search}>
        {actionLabel}
      </NotificationItem.Action>
    </NotificationItem>
  );
};
