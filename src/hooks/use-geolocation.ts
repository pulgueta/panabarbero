import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type GeoStatus =
  | "idle"
  | "prompting"
  | "granted"
  | "denied"
  | "unsupported"
  | "error";

export interface GeoCoords {
  lat: number;
  lng: number;
}

export interface UseGeolocationResult {
  status: GeoStatus;
  coords: GeoCoords | null;
  /**
   * Triggers the native permission prompt. Must be called from a user gesture.
   * Resolves with the coordinates on success, or `null` if denied/unavailable.
   */
  request: () => Promise<GeoCoords | null>;
}

function subscribeToNothing() {
  return () => {
    // Geolocation support never changes, so there is nothing to unsubscribe.
  };
}

function getIsGeolocationSupported() {
  return "geolocation" in navigator;
}

/** The server cannot know; assume support so hydration matches the "idle" SSR render. */
function getServerIsGeolocationSupported() {
  return true;
}

/** Best-effort: report an already-denied permission without prompting. */
async function reflectDeniedPermission(
  isActive: () => boolean,
  onDenied: () => void,
) {
  try {
    const result = await navigator.permissions.query({ name: "geolocation" });

    if (isActive() && result.state === "denied") onDenied();
  } catch {
    // The Permissions API is optional; keep the current status.
  }
}

/**
 * Thin wrapper over the browser Geolocation API. Surfaces a coarse status so
 * the UI can branch (prompt, granted, denied, unsupported). Never auto-prompts:
 * `request()` must be invoked from a user gesture.
 */
export function useGeolocation(): UseGeolocationResult {
  const [requestStatus, setRequestStatus] = useState<GeoStatus>("idle");
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const isSupported = useSyncExternalStore(
    subscribeToNothing,
    getIsGeolocationSupported,
    getServerIsGeolocationSupported,
  );
  const status = isSupported ? requestStatus : "unsupported";

  // Best-effort: reflect an already-denied permission without prompting.
  useEffect(() => {
    let active = true;

    if (
      "geolocation" in navigator &&
      navigator.permissions?.query !== undefined
    ) {
      void reflectDeniedPermission(
        () => active,
        () => setRequestStatus("denied"),
      );
    }

    return () => {
      active = false;
    };
  }, []);

  const request = useCallback((): Promise<GeoCoords | null> => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setRequestStatus("unsupported");
      return Promise.resolve(null);
    }

    setRequestStatus("prompting");
    // oxlint-disable-next-line promise/avoid-new -- wraps the callback-based Geolocation API
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCoords(next);
          setRequestStatus("granted");
          resolve(next);
        },
        (error) => {
          setRequestStatus(
            error.code === error.PERMISSION_DENIED ? "denied" : "error",
          );
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
      );
    });
  }, []);

  return { status, coords, request };
}
