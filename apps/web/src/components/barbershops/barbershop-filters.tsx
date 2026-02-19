import { useNavigate, useSearch } from "@tanstack/react-router";
import type { FC } from "react";
import { useEffect, useRef } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useColombia } from "@/hooks/use-colombia";
import {
  setLocationCity,
  setLocationState,
  useLocationStore,
} from "@/store/location";

export const BarbershopFilters: FC = () => {
  const search = useSearch({ from: "/barbershops/" });
  const navigate = useNavigate({ from: "/barbershops/" });

  const { states, citiesFromState } = useColombia();

  const { state, city } = useLocationStore();
  const prevSearchRef = useRef({ state: search.state, city: search.city });

  // Sync URL search params with store when URL changes (e.g., browser back/forward, direct link)
  useEffect(() => {
    const prevSearch = prevSearchRef.current;
    const urlChanged =
      prevSearch.state !== search.state || prevSearch.city !== search.city;

    if (urlChanged) {
      // URL changed externally or on mount, sync to store
      if (search.state !== state) {
        setLocationState(search.state);
      }
      if (search.city !== city) {
        setLocationCity(search.city);
      }

      // Update ref to current URL
      prevSearchRef.current = { state: search.state, city: search.city };
    }
  }, [search.state, search.city, state, city]);

  const availableCities = state ? citiesFromState?.(state) : [];

  const handleStateChange = (newState: string) => {
    // Update store first (this also clears city)
    setLocationState(newState);

    // Update URL to match store
    navigate({
      to: ".",
      search: () => ({
        state: newState,
        city: undefined,
      }),
      replace: false,
    });
  };

  const handleCityChange = (newCity: string) => {
    // Update store
    setLocationCity(newCity);

    // Update URL to match store
    navigate({
      to: ".",
      search: () => ({
        state,
        city: newCity,
      }),
      replace: false,
    });
  };

  return (
    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
      <Select value={state ?? ""} onValueChange={handleStateChange}>
        <SelectTrigger className="w-full min-w-48 bg-background dark:bg-card">
          <SelectValue placeholder="Departamento" />
        </SelectTrigger>
        <SelectContent>
          {states.map((s) => (
            <SelectItem key={s.state} value={s.state}>
              {s.state}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        key={`city-${state}`}
        value={city ?? ""}
        onValueChange={handleCityChange}
        disabled={!state}
      >
        <SelectTrigger className="w-full min-w-48 bg-background dark:bg-card">
          <SelectValue placeholder="Ciudad" />
        </SelectTrigger>
        <SelectContent>
          {availableCities.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
