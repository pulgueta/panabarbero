import { useCallback } from "react";

import { startOfDay } from "@/lib/utils";
import { useLocationStore } from "@/store/barbershop-filters";

/**
 * Resolves the `search` params each nav target needs. Extracts the ternary
 * that was previously duplicated across the desktop header and bottom bar so
 * every navigation surface stays in sync.
 */
export function useNavSearch() {
  const persistedState = useLocationStore((s) => s.state);
  const persistedCity = useLocationStore((s) => s.city);

  return useCallback(
    (to: string) => {
      if (to === "/profile") {
        return { tab: "account" } as const;
      }
      if (to === "/profile/barbershops/appointments") {
        return { date: startOfDay(Date.now()).getTime() };
      }
      if (to === "/barbershops") {
        return { city: persistedCity, state: persistedState };
      }
      return undefined;
    },
    [persistedCity, persistedState],
  );
}
