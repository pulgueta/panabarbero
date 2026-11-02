import { CalendarDotsIcon, CheckCircleIcon } from "@phosphor-icons/react";
import type { FC } from "react";

import { getAppointmentHubLink } from "@/components/notifications/appointment-hub-link";
import { NotificationItem } from "@/components/notifications/notification-item";
import { formatRelativeTime } from "@/components/notifications/relative-time";

import type { VariantBaseProps } from "./appointment-notification";

const config = {
  appointment_reschedule_request: {
    tone: "primary" as const,
    icon: <CalendarDotsIcon weight="duotone" />,
    actionLabel: "Revisar solicitud",
  },
  appointment_reschedule_accepted: {
    tone: "success" as const,
    icon: <CheckCircleIcon weight="duotone" />,
    actionLabel: "Ver cita",
  },
};

export const RescheduleNotification: FC<
  VariantBaseProps & { kind: keyof typeof config }
> = ({
  notification,
  density,
  isUnread,
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
      <NotificationItem.Action to={link.to} search={link.search}>
        {actionLabel}
      </NotificationItem.Action>
    </NotificationItem>
  );
};
