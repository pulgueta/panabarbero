import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface BarbershopFiltersState {
  state: string | undefined;
  city: string | undefined;
}

interface BarbershopFiltersActions {
  setState: (state: string | undefined) => void;
  setCity: (city: string | undefined) => void;
  reset: () => void;
}

type BarbershopFiltersStore = BarbershopFiltersState & BarbershopFiltersActions;

export const useBarbershopFiltersStore = create<BarbershopFiltersStore>()(
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
      name: "barbershop-filters",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
