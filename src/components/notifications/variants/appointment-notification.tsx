import type { InAppNotification } from "@convex/schema";
import {
  CalendarBlankIcon,
  CalendarCheckIcon,
  ClockCountdownIcon,
} from "@phosphor-icons/react";
import type { FC } from "react";

import { getAppointmentHubLink } from "@/components/notifications/appointment-hub-link";
import { NotificationItem } from "@/components/notifications/notification-item";
import { formatRelativeTime } from "@/components/notifications/relative-time";

export interface VariantBaseProps {
  notification: InAppNotification;
  /** Barbers, staff, and owners use the barbershop calendar; pure customers use the Citas tab. */
  usesBarberCalendar: boolean;
  density?: "compact" | "comfortable";
  onMarkRead?: (id: InAppNotification["_id"]) => void;
  onSelect?: () => void;
}

const config = {
  appointment_created: {
    tone: "primary" as const,
    icon: <CalendarCheckIcon weight="duotone" />,
    actionLabel: "Ver mi cita",
    /** Only customers receive this kind in-app. */
    getLink: () => getAppointmentHubLink(false),
  },
  barber_appointment_created: {
    tone: "primary" as const,
    icon: <CalendarCheckIcon weight="duotone" />,
    actionLabel: "Ver citas",
    getLink: () => getAppointmentHubLink(true),
  },
  appointment_reminder: {
    tone: "warning" as const,
    icon: <ClockCountdownIcon weight="duotone" />,
    actionLabel: "Ver cita",
    /** Reminder notifications are only recorded for customers. */
    getLink: () => getAppointmentHubLink(false),
  },
  past_appointment_reminder: {
    tone: "muted" as const,
    icon: <CalendarBlankIcon weight="duotone" />,
    actionLabel: "Marcar estado",
    /** Past reminders are only for barbers. */
    getLink: () => getAppointmentHubLink(true),
  },
};

export const AppointmentNotification: FC<
  VariantBaseProps & {
    kind: keyof typeof config;
  }
> = ({
  notification,
  density,
  onMarkRead,
  onSelect,
  kind,
  usesBarberCalendar: _usesBarberCalendar,
}) => {
  const { tone, icon, actionLabel, getLink } = config[kind];
  const link = getLink();

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
