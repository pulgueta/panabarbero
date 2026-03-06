import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface LocationState {
  state: string | undefined;
  city: string | undefined;
}

interface LocationActions {
  setState: (state: string | undefined) => void;
  setCity: (city: string | undefined) => void;
  reset: () => void;
}

type LocationStore = LocationState & LocationActions;

export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => ({
      state: undefined,
      city: undefined,
      setState: (newState) =>
        set({
          state: newState,
          city: undefined,
        }),
      setCity: (newCity) =>
        set({
          city: newCity,
        }),
      reset: () =>
        set({
          state: undefined,
          city: undefined,
        }),
    }),
    {
      name: "department-city-selection",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
