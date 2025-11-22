import { usePostHog } from "posthog-js/react";
import { useCallback, useEffect } from "react";

import { useBarbershopsByOwnerId } from "./use-barbershop";
import { useSession } from "./use-session";

export function useAnalytics() {
  const posthog = usePostHog();

  const { data: user } = useSession();
  const { data: barbershops } = useBarbershopsByOwnerId(user?.userId ?? "");

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

    if (barbershops?.length) {
      posthog?.group(
        "barbershops",
        JSON.stringify(barbershops.map((b) => b.uuid)),
        {
          name: barbershops.map((b) => b.name),
        },
      );
    }
  }, [user, posthog, barbershops]);

  return {
    captureEvent,
  };
}
