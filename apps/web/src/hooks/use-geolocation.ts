import { useCallback, useEffect, useState } from "react";

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

/**
 * Thin wrapper over the browser Geolocation API. Surfaces a coarse status so
 * the UI can branch (prompt, granted, denied, unsupported). Never auto-prompts:
 * `request()` must be invoked from a user gesture.
 */
export function useGeolocation(): UseGeolocationResult {
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [coords, setCoords] = useState<GeoCoords | null>(null);

  // Best-effort: reflect an already-denied permission without prompting.
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    if (!navigator.permissions?.query) return;

    let active = true;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        if (active && result.state === "denied") setStatus("denied");
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const request = useCallback((): Promise<GeoCoords | null> => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("unsupported");
      return Promise.resolve(null);
    }

    setStatus("prompting");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCoords(next);
          setStatus("granted");
          resolve(next);
        },
        (error) => {
          setStatus(
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
