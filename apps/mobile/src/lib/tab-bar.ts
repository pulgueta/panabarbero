import { useSyncExternalStore } from "react";

// iOS 26 minimizes the tab bar from any scroll view in the tab, and a
// screen that pops without scrolling up leaves it minimized. The behavior is
// only a host-level prop, so a focused screen can pin the bar expanded here.
let pinnedCount = 0;
const pinListeners = new Set<() => void>();
const isPinned = () => pinnedCount > 0;

/** Keeps the tab bar expanded while the calling screen is focused. */
export function pinTabBarExpanded() {
  pinnedCount += 1;
  for (const listener of pinListeners) listener();
  return () => {
    pinnedCount -= 1;
    for (const listener of pinListeners) listener();
  };
}

function subscribe(listener: () => void) {
  pinListeners.add(listener);
  return () => pinListeners.delete(listener);
}

/** True while any focused screen pins the tab bar expanded. */
export function useTabBarPinned() {
  return useSyncExternalStore(subscribe, isPinned, isPinned);
}
