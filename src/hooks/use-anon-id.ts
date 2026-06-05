import { useEffect, useState } from "react";

const STORAGE_KEY = "pana-anon-id";

function readOrCreateAnonId(): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const fresh = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // localStorage can throw in private mode / when blocked — fall back to none.
    return undefined;
  }
}

/**
 * Stable per-browser anonymous session id, persisted in `localStorage`.
 *
 * Lets logged-out visitors talk to Pana: the chat passes this id as the
 * caller, which the backend prefixes (`anon:`) and rate-limits under the
 * tighter anonymous bucket. Returns `undefined` during SSR and the first
 * client render (before mount) to avoid hydration mismatches.
 */
export function useAnonId(): string | undefined {
  const [anonId, setAnonId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setAnonId(readOrCreateAnonId());
  }, []);

  return anonId;
}
