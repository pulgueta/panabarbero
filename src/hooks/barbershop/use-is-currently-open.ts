import type { Barbershop } from "@convex/schema";
import { useEffect, useState } from "react";

import { isCurrentlyOpen } from "@/lib/schedule-utils";

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
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  useEffect(() => {
    if (!availability) {
      setIsOpen(null);
      return;
    }

    setIsOpen(isCurrentlyOpen(availability));
  }, [availability]);

  return isOpen;
}
