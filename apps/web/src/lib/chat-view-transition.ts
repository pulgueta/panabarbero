import type { ParsedLocation } from "@tanstack/react-router";

const isThreadPath = (pathname: string): boolean =>
  pathname.startsWith("/chat/") && pathname !== "/chat/";

/**
 * Directional view transition for navigating within the Pana chat. Slides the
 * `main-content` pane left when going "deeper" (opening or switching threads)
 * and right when stepping back out to the empty `/chat` view, reusing the
 * app-wide `slide-left` / `slide-right` transition types defined in styles.css.
 * Browsers without view-transition type support fall back to a plain
 * cross-fade automatically (handled by TanStack Router).
 */
export const chatViewTransition = {
  types: ({
    fromLocation,
    toLocation,
  }: {
    fromLocation?: ParsedLocation;
    toLocation: ParsedLocation;
  }): string[] => {
    const goingToThread = isThreadPath(toLocation.pathname);
    const leavingThread = isThreadPath(fromLocation?.pathname ?? "");

    // Stepping back out to the empty /chat view.
    if (leavingThread && !goingToThread) return ["slide-right"];
    // Opening a thread, or switching between threads → forward.
    return ["slide-left"];
  },
};
