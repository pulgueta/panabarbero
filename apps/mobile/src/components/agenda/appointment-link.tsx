import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import { Link, useRouter } from "expo-router";
import { cloneElement, type ReactElement } from "react";
import { Platform } from "react-native";

import {
  type Appointment,
  type AppointmentQuickAction,
  appointmentRules,
} from "@/lib/appointments";

/** Full documents and range rows both fit. */
type LinkedAppointment = {
  _id: Id<"appointments">;
  status: Appointment["status"];
  date: number;
  proposedDate?: number;
};

type PressableChild = ReactElement<{
  onPress?: () => void;
  onLongPress?: () => void;
}>;

type AppointmentLinkProps = {
  appointment: LinkedAppointment;
  /** Runs on tap before the detail opens, for example to highlight the block. */
  onPress: () => void;
  /** One block that forwards `onPress` and `onLongPress` to its pressable. */
  children: PressableChild;
};

function detailHref(id: Id<"appointments">, action?: AppointmentQuickAction) {
  return {
    pathname: "/(app)/(tabs)/agenda/[appointmentId]" as const,
    params: action ? { appointmentId: id, action } : { appointmentId: id },
  };
}

type MenuItem = {
  action: AppointmentQuickAction;
  label: string;
  icon:
    | "checkmark.circle"
    | "person.fill.xmark"
    | "calendar.badge.clock"
    | "xmark.circle"
    | "trash";
  destructive?: boolean;
};

/** The same gates as the detail buttons, as menu rows. */
function menuItems(appointment: LinkedAppointment): MenuItem[] {
  const rules = appointmentRules(appointment);
  const items: MenuItem[] = [];
  if (rules.needsMark) {
    items.push(
      { action: "complete", label: "Completar", icon: "checkmark.circle" },
      { action: "noShow", label: "No asistió", icon: "person.fill.xmark" },
    );
  }
  if (rules.canRequestReschedule) {
    items.push({
      action: "reschedule",
      label: "Solicitar reagendamiento",
      icon: "calendar.badge.clock",
    });
  }
  if (rules.canCancel) {
    items.push({
      action: "cancel",
      label: "Cancelar",
      icon: "xmark.circle",
      destructive: true,
    });
  }
  if (rules.canDelete) {
    items.push({
      action: "delete",
      label: "Eliminar",
      icon: "trash",
      destructive: true,
    });
  }
  return items;
}

/**
 * Tap opens the appointment detail. On iOS a long press lifts the block into
 * a native context menu with a peek of the detail; each action opens the
 * detail with that flow (and its confirmation) already up. Android gets the
 * detail on tap and on long press.
 */
export function AppointmentLink({
  appointment,
  onPress,
  children,
}: AppointmentLinkProps) {
  const router = useRouter();
  const href = detailHref(appointment._id);

  if (Platform.OS !== "ios") {
    const open = () => {
      onPress();
      router.push(href);
    };
    return cloneElement(children, { onPress: open, onLongPress: open });
  }

  return (
    <Link href={href} asChild onPress={onPress}>
      <Link.Trigger>{children}</Link.Trigger>
      <Link.Preview />
      <Link.Menu>
        <Link.MenuAction icon="info.circle" onPress={() => router.push(href)}>
          Ver detalle
        </Link.MenuAction>
        {menuItems(appointment).map((item) => (
          <Link.MenuAction
            key={item.action}
            icon={item.icon}
            destructive={item.destructive}
            onPress={() =>
              router.push(detailHref(appointment._id, item.action))
            }
          >
            {item.label}
          </Link.MenuAction>
        ))}
      </Link.Menu>
    </Link>
  );
}
