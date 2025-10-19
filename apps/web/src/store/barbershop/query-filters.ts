import { Store, useStore } from "@tanstack/react-store";

export const barbershopQueryFiltersStore = new Store({
  city: undefined,
  state: undefined,
});

export function useQueryFilters() {
  return useStore(barbershopQueryFiltersStore);
}
