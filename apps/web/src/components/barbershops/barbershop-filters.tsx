import { useNavigate, useSearch } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import type { FC } from "react";
import { useEffect, useRef } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FiltersState = {
  city?: string;
  state?: string;
  departments: string[];
  cities: Record<string, string[]>;
  filteredCities: string[];
  isLoading: boolean;
};

const filtersStore = new Store<FiltersState>({
  city: undefined,
  state: undefined,
  departments: [],
  cities: {},
  filteredCities: [],
  isLoading: true,
});

const LS_CITY = "pb_city";
const LS_STATE = "pb_state";

export const BarbershopFilters: FC = () => {
  const filters = useStore(filtersStore);
  const search = useSearch({ from: "/barbershops/" });
  const navigate = useNavigate({ from: "/barbershops" });

  const hydrated = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const lsCity = localStorage.getItem(LS_CITY) || undefined;
    const lsState = localStorage.getItem(LS_STATE) || undefined;

    const nextState = search.state ?? lsState;
    const nextCity = search.city ?? lsCity;

    filtersStore.setState((s) => {
      if (s.city === nextCity && s.state === nextState) return s;
      return { ...s, city: nextCity, state: nextState };
    });

    if (search.state) localStorage.setItem(LS_STATE, search.state);
    if (search.city) localStorage.setItem(LS_CITY, search.city);

    if (!search.state && lsState && !search.city && lsCity) {
      navigate({
        to: ".",
        search: (prev) => ({ ...prev, state: lsState, city: lsCity }),
        replace: true,
      });
    }
  }, []);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch(
          "https://raw.githubusercontent.com/marcovega/colombia-json/master/colombia.json",
        );
        const data: { departamento: string; ciudades: string[] }[] =
          await res.json();

        const departments = data.map((d) => d.departamento);
        const citiesMap: Record<string, string[]> = {};
        data.forEach((d) => {
          citiesMap[d.departamento] = d.ciudades;
        });

        filtersStore.setState((s) => ({
          ...s,
          departments,
          cities: citiesMap,
          filteredCities:
            s.state && citiesMap[s.state] ? citiesMap[s.state] : [],
          isLoading: false,
        }));
      } catch (err) {
        console.error("Failed to fetch departments/cities", err);
        filtersStore.setState((s) => ({ ...s, isLoading: false }));
      }
    };

    fetchLocations();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional partial dependencies
  useEffect(() => {
    const newCities =
      filters.state && filters.cities[filters.state]
        ? filters.cities[filters.state]
        : [];

    if (
      newCities.length !== filters.filteredCities.length ||
      newCities.some((c, i) => c !== filters.filteredCities[i])
    ) {
      filtersStore.setState((s) => ({ ...s, filteredCities: newCities }));
    }
  }, [filters.state, filters.cities]);

  const apply = (next: Partial<FiltersState>) => {
    filtersStore.setState((s) => ({ ...s, ...next }));

    if ("state" in next) {
      const v = next.state as string | undefined;
      if (v) localStorage.setItem(LS_STATE, v);
      else localStorage.removeItem(LS_STATE);
    }

    if ("city" in next) {
      const v = next.city as string | undefined;
      if (v) localStorage.setItem(LS_CITY, v);
      else localStorage.removeItem(LS_CITY);
    }

    navigate({
      to: ".",
      search: (prev) => {
        const merged = { ...prev, ...next };
        const same = merged.state === prev.state && merged.city === prev.city;
        return same ? prev : merged;
      },
    });
  };

  return (
    <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex flex-row items-center gap-2">
        <Select
          value={filters.state ?? ""}
          onValueChange={(v) =>
            apply({ state: v || undefined, city: undefined })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            {filters.departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.city ?? ""}
          onValueChange={(v) => apply({ city: v || undefined })}
          disabled={!filters.state}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Ciudad" />
          </SelectTrigger>
          <SelectContent>
            {filters.filteredCities.map((city) => (
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
