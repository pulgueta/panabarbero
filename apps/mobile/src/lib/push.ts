import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import type { Href } from "expo-router";
import { Platform } from "react-native";

export type PushTokenResult =
  | { token: string }
  | { token: null; reason: "simulator" | "denied" | "no-project-id" | "error" };

/** Show pushes as banners while the app is in the foreground. Call once. */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Ask for permission and return this device's Expo push token. Never throws. */
export async function getPushToken(): Promise<PushTokenResult> {
  if (!Device.isDevice) return { token: null, reason: "simulator" };

  try {
    // Android 13+ shows the permission prompt only after a channel exists.
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Notificaciones",
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status === "undetermined") {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== "granted") return { token: null, reason: "denied" };

    // The EAS project does not exist yet; this is expected until it does.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return { token: null, reason: "no-project-id" };

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: data };
  } catch (error) {
    console.warn("Could not get the push token", error);
    return { token: null, reason: "error" };
  }
}

type NotificationData = {
  kind?: string;
  appointmentId?: string;
  barbershopId?: string;
  reviewId?: string;
};

/** Backend notification kinds (see `convex/notifications.ts`) that open the agenda. */
const agendaKinds = new Set([
  "appointment_created",
  "barber_appointment_created",
  "appointment_cancelled",
  "appointment_reschedule_request",
  "appointment_reschedule_accepted",
  "appointment_reschedule_denied",
  "appointment_reminder",
  "past_appointment_reminder",
  "customer_on_my_way",
  "appointment_reassigned",
  "barber_removed_cancellation",
  "service_deleted_cancellation",
  "service_line_removed",
]);

/**
 * Every other kind opens the notifications inbox: `review_needs_attention`,
 * `low_stock`, and kinds with no mobile destination yet (`team_invited`,
 * `review_invite`).
 */
const inboxHref: Href = "/(app)/(tabs)/notificaciones";

/** Where a tapped notification opens. Unknown kinds open the inbox. */
export function notificationHrefForData(data: NotificationData): Href {
  if (data.kind && agendaKinds.has(data.kind)) {
    return data.appointmentId
      ? {
          pathname: "/(app)/(tabs)/agenda/[appointmentId]",
          params: { appointmentId: data.appointmentId },
        }
      : "/(app)/(tabs)/agenda";
  }
  return inboxHref;
}
