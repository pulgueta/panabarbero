import { tanstack, useColombia } from "@panabarbero/constants";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { FC } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalStorage } from "@/hooks/use-local-storage";

export const BarbershopFilters: FC = () => {
  const search = useSearch({ from: "/barbershops/" });
  const navigate = useNavigate({ from: "/barbershops" });

  const { states, citiesFromState } = useColombia();

  const [storedState, setStoredState] = useLocalStorage<string | undefined>(
    tanstack.localStorageKeys.barbershopsState,
  );
  const [storedCity, setStoredCity] = useLocalStorage<string | undefined>(
    tanstack.localStorageKeys.barbershopsCity,
  );

  const city = storedCity ?? search.city ?? "";
  const state = storedState ?? search.state ?? "";

  const availableCities = state ? citiesFromState?.(state) : [];

  const apply = (next: Partial<typeof search>) => {
    // If state is being changed, clear the city
    const isStateChange = next.state !== undefined && next.state !== state;
    const effCity = next.city ?? (isStateChange ? undefined : city ?? undefined);

    const finalState = next.state ?? state ?? undefined;
    const finalCity = isStateChange ? undefined : effCity;

    setStoredState(finalState);
    setStoredCity(finalCity);

    navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        state: finalState,
        city: finalCity,
      }),
    });
  };

  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
      <Select
        value={state}
        onValueChange={(v) => apply({ state: v ?? undefined })}
      >
        <SelectTrigger className="w-full min-w-48 bg-background dark:bg-card">
          <SelectValue placeholder="Departamento" />
        </SelectTrigger>
        <SelectContent>
          {states.map((state) => (
            <SelectItem key={state.state} value={state.state}>
              {state.state}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        key={`city-${state}`}
        value={city}
        onValueChange={(v) => apply({ city: v ?? undefined })}
        disabled={!state}
      >
        <SelectTrigger className="w-full min-w-48 bg-background dark:bg-card">
          <SelectValue placeholder="Ciudad" />
        </SelectTrigger>
        <SelectContent>
          {availableCities.map((city) => (
            <SelectItem key={city} value={city}>
              {city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
