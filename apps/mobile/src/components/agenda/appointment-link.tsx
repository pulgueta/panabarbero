import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import { Link, useRouter } from "expo-router";
import { cloneElement, type ReactElement } from "react";
import {
  type AccessibilityActionEvent,
  type AccessibilityState,
  Platform,
  View,
} from "react-native";

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
  /** Frame of the block inside its timeline; the link owns the position. */
  style: { top: number; height: number; left: number; width: number };
  /** Read by VoiceOver for the whole block. */
  accessibilityLabel: string;
  accessibilityState?: AccessibilityState;
  /** One block that fills the frame and forwards `onPress` and `onLongPress` to its pressable. */
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
    // Short, so the menu row stays on one line.
    items.push({
      action: "reschedule",
      label: "Reagendar",
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
 *
 * The native preview wrapper keeps its children out of the accessibility
 * tree, so on iOS the frame itself is the accessible element and offers the
 * menu rows as custom actions.
 */
export function AppointmentLink({
  appointment,
  onPress,
  style,
  accessibilityLabel,
  accessibilityState,
  children,
}: AppointmentLinkProps) {
  const router = useRouter();
  const href = detailHref(appointment._id);
  const frame = { position: "absolute" as const, ...style };

  if (Platform.OS !== "ios") {
    const open = () => {
      onPress();
      router.push(href);
    };
    return (
      <View style={frame}>
        {cloneElement(children, { onPress: open, onLongPress: open })}
      </View>
    );
  }

  const items = menuItems(appointment);
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const { actionName } = event.nativeEvent;
    if (actionName === "activate") {
      onPress();
      router.push(href);
      return;
    }
    const item = items.find((candidate) => candidate.action === actionName);
    if (item) router.push(detailHref(appointment._id, item.action));
  };

  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      accessibilityHint="Abre el detalle de la cita"
      accessibilityActions={[
        { name: "activate", label: "Ver detalle" },
        ...items.map((item) => ({ name: item.action, label: item.label })),
      ]}
      onAccessibilityAction={onAccessibilityAction}
      style={frame}
    >
      <Link href={href} asChild onPress={onPress}>
        <Link.Trigger>{children}</Link.Trigger>
        <Link.Preview />
        <Link.Menu>
          <Link.MenuAction icon="info.circle" onPress={() => router.push(href)}>
            Ver detalle
          </Link.MenuAction>
          {items.map((item) => (
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
    </View>
  );
}
