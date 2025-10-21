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

export const BarbershopFilters: FC = () => {
  const search = useSearch({ from: "/barbershops/" });
  const navigate = useNavigate({ from: "/barbershops" });

  const { states, citiesFromState } = useColombia();

  const availableCities = search.state ? citiesFromState?.(search.state) : [];

  const apply = (next: Partial<typeof search>) => {
    navigate({
      to: ".",
      search: (prev) => {
        return { ...prev, ...next };
      },
    });
  };

  return (
    <div className="mx-auto grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="flex flex-row items-center gap-2">
        <Select
          value={search.state}
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
          value={search.city}
          onValueChange={(v) => apply({ city: v || undefined })}
          disabled={!search.state}
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
