import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;

function subscribeToMobileQuery(onChange: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

  mql.addEventListener("change", onChange);

  return () => mql.removeEventListener("change", onChange);
}

function getIsMobile() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getServerIsMobile() {
  return false;
}

export function useIsMobile() {
  return useSyncExternalStore(
    subscribeToMobileQuery,
    getIsMobile,
    getServerIsMobile,
  );
}
