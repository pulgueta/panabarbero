import { useCallback } from "react";

import * as api from "./api";
import jsonStates from "./colombia.json";
import * as router from "./router";
import * as tanstack from "./tanstack";

export const APP_NAME = "PanaBarbero" as const;

export function useColombia() {
  const states = jsonStates.map((state) => ({
    state: state.departamento,
    cities: state.ciudades,
  }));

  const citiesFromState = useCallback(
    (state: string) => {
      const found = states.find((s) => s.state === state);

      if (!found) {
        return [];
      }

      return found.cities;
    },
    [states],
  );

  return {
    states,
    citiesFromState,
  };
}

export { api, router, tanstack };
