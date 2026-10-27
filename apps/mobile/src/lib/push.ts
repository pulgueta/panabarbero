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

/** Backend notification kinds (see `convex/notifications.ts`) to app routes. */
const hrefByKind: Record<string, Href> = {
  // Agenda
  appointment_created: "/",
  barber_appointment_created: "/",
  appointment_cancelled: "/",
  appointment_reminder: "/",
  past_appointment_reminder: "/",
  barber_removed_cancellation: "/",
  service_deleted_cancellation: "/",
  service_line_removed: "/",
  // Inbox
  appointment_reschedule_request: "/",
  appointment_reschedule_accepted: "/",
  appointment_reschedule_denied: "/",
  // Reviews
  review_needs_attention: "/",
  // Inventory
  low_stock: "/",
};

/** Where a tapped notification opens. Unknown kinds open home. */
export function notificationHrefForData(data: NotificationData): Href {
  return (data.kind && hrefByKind[data.kind]) || "/";
}
