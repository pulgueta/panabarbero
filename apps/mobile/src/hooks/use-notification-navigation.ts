import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";

import { notificationHrefForData } from "@/lib/push";

/** Open the matching screen when the user taps a notification. */
export function useNotificationNavigation() {
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledId = useRef<string | null>(null);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse) => {
      const { identifier, content } = response.notification.request;
      if (handledId.current === identifier) return;
      handledId.current = identifier;
      router.push(notificationHrefForData(content.data ?? {}));
    };

    // Cold start: the tap that launched the app.
    if (lastResponse) open(lastResponse);

    // Warm: taps while the app is running.
    const subscription =
      Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [lastResponse, router]);
}
