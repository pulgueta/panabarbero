import { colombia } from "@/config/colombia";

export function useColombia() {
  const states = colombia?.map((state) => ({
    state: state.departamento,
    cities: state.ciudades,
  }));

  const citiesFromState = (state: string) => {
    const found = states?.find((s) => s.state === state);

    if (!found) {
      return [];
    }

    return found.cities;
  };

  const stateFromCity = (city: string) =>
    states?.find((s) => (s.cities.includes(city) ? s.state : undefined))?.state;

  return {
    states,
    citiesFromState,
    stateFromCity,
  };
}
