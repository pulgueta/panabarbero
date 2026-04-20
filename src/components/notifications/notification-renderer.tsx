import type { InAppNotification } from "@convex/schema";
import type { FC } from "react";

import { AppointmentNotification } from "./variants/appointment-notification";
import { CancellationNotification } from "./variants/cancellation-notification";
import { RescheduleNotification } from "./variants/reschedule-notification";
import { TeamInviteNotification } from "./variants/team-invite-notification";

export interface NotificationRendererProps {
  notification: InAppNotification;
  /** True when the viewer manages appointments from the barbershop calendar (barber, staff, or owner). */
  usesBarberCalendar: boolean;
  density?: "compact" | "comfortable";
  onMarkRead?: (id: InAppNotification["_id"]) => void;
  onSelect?: () => void;
}

/**
 * Dispatches an `InAppNotification` row to the matching family component.
 * Each family handles its own icon, tone, and quick action, while sharing
 * the compound `NotificationItem` primitive.
 */
export const NotificationRenderer: FC<NotificationRendererProps> = ({
  notification,
  usesBarberCalendar,
  density,
  onMarkRead,
  onSelect,
}) => {
  const shared = {
    notification,
    usesBarberCalendar,
    density,
    onMarkRead,
    onSelect,
  };

  switch (notification.kind) {
    case "appointment_created":
    case "barber_appointment_created":
    case "appointment_reminder":
    case "past_appointment_reminder":
      return <AppointmentNotification {...shared} kind={notification.kind} />;

    case "appointment_cancelled":
    case "appointment_reschedule_denied":
    case "barber_removed_cancellation":
    case "service_deleted_cancellation":
      return <CancellationNotification {...shared} kind={notification.kind} />;

    case "appointment_reschedule_request":
    case "appointment_reschedule_accepted":
      return <RescheduleNotification {...shared} kind={notification.kind} />;

    case "team_invited":
      return <TeamInviteNotification {...shared} />;

    default: {
      const _exhaustive: never = notification.kind;
      return null as never | typeof _exhaustive;
    }
  }
};
