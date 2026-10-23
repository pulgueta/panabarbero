import type { Barbershop } from "@convex/schema";
import { useSyncExternalStore } from "react";

import { isCurrentlyOpen } from "@/lib/schedule-utils";

/**
 * Recompute periodically so the badge crosses open/close/lunch boundaries
 * while the page stays open.
 */
function subscribeToMinuteTicks(onTick: () => void) {
  const id = setInterval(onTick, 60_000);

  return () => clearInterval(id);
}

function getServerIsOpen() {
  return null;
}

/**
 * Open/closed status computed **after mount only**.
 *
 * `isCurrentlyOpen` reads `new Date()` and the host's local timezone, so an
 * SSR-rendered badge can disagree with the client (different TZ, or simply
 * crossing an open/close boundary between render and hydration) and produce a
 * hydration mismatch. Returning `null` on the server and on the first client
 * render keeps both passes identical; callers hide the badge until it resolves.
 */
export function useIsCurrentlyOpen(
  availability: Barbershop["availability"] | undefined,
): boolean | null {
  return useSyncExternalStore(
    subscribeToMinuteTicks,
    () => (availability ? isCurrentlyOpen(availability) : null),
    getServerIsOpen,
  );
}
