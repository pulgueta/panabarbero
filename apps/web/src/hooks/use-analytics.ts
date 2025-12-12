import { usePostHog } from "posthog-js/react";
import { useCallback, useEffect } from "react";

import { useSession } from "./use-session";

export function useAnalytics() {
  const posthog = usePostHog();

  const { data: user } = useSession();

  const captureEvent = useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      posthog?.capture(event, properties);
    },
    [posthog],
  );

  useEffect(() => {
    if (user?.userId) {
      posthog?.identify(user.userId, {
        email: user.email,
      });
    }
  }, [user, posthog]);

  return {
    captureEvent,
  };
}
