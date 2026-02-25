import { Store, useStore } from "@tanstack/react-store";

type LocationState = {
  state: string | undefined;
  city: string | undefined;
};

const STORAGE_KEY = "department-city-selection";

const getInitialState = (): LocationState => {
  if (typeof window === "undefined") {
    return { state: undefined, city: undefined };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { state: undefined, city: undefined };
    }
    return JSON.parse(raw) as LocationState;
  } catch {
    return { state: undefined, city: undefined };
  }
};

const persistState = (nextState: LocationState) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
};

export const locationStore = new Store<LocationState>(getInitialState());

export const setLocationState = (newState: string | undefined) => {
  const nextState = { state: newState, city: undefined };
  locationStore.setState(() => nextState);
  persistState(nextState);
};

export const setLocationCity = (newCity: string | undefined) => {
  locationStore.setState((prev) => {
    const nextState = { ...prev, city: newCity };
    persistState(nextState);
    return nextState;
  });
};

export const resetLocation = () => {
  const nextState = { state: undefined, city: undefined };
  locationStore.setState(() => nextState);
  persistState(nextState);
};

export const useLocationStore = () => useStore(locationStore, (state) => state);
