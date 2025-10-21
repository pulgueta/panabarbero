import { useColombia } from "@panabarbero/constants";
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
    "barbershops_state",
  );
  const [storedCity, setStoredCity] = useLocalStorage<string | undefined>(
    "barbershops_city",
  );

  const state = storedState ?? search.state;
  const city = storedCity ?? search.city;

  const availableCities = state ? citiesFromState?.(state) : [];

  const apply = (next: Partial<typeof search>) => {
    setStoredState(next.state);
    setStoredCity(next.city);
    navigate({ to: ".", search: (prev) => ({ ...prev, ...next }) });
  };

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex flex-row items-center gap-2">
        <Select
          value={state}
          onValueChange={(v) =>
            apply({ state: v || undefined, city: undefined })
          }
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
          value={city}
          onValueChange={(v) => apply({ city: v || undefined })}
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
    </div>
  );
};
