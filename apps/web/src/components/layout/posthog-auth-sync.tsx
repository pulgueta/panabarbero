import { usePostHog } from "@posthog/react";
import { useAuth } from "@workos/authkit-tanstack-react-start/client";
import { useEffect } from "react";

/**
 * Ties PostHog identity to the WorkOS session: identify on login, reset on
 * logout. `_isIdentified()` guards the reset so anonymous visitors keep a
 * stable anon id across visits.
 */
export function PostHogAuthSync() {
  const posthog = usePostHog();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (user) {
      posthog.identify(user.id, {
        email: user.email,
        name:
          [user.firstName, user.lastName].filter(Boolean).join(" ") ||
          undefined,
      });
    } else if (posthog._isIdentified()) {
      posthog.reset();
    }
  }, [posthog, user, loading]);

  return null;
}
