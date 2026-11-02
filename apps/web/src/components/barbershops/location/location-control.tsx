import { lazy, Suspense } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLocation } from "./location-provider";

export const LocationMap = lazy(() =>
  import("./location-map").then((mod) => ({ default: mod.LocationMap })),
);

export function LocationMapSuspense() {
  return (
    <Suspense fallback={<Skeleton className="h-60 w-full rounded-xl" />}>
      <LocationMap />
    </Suspense>
  );
}

export function LocationSelects({
  onCitySelected,
  className,
}: {
  onCitySelected?: () => void;
  className?: string;
}) {
  const { state, actions, meta } = useLocation();

  return (
    <div
      className={cn("grid w-full grid-cols-1 gap-3 sm:grid-cols-2", className)}
    >
      <Select
        onValueChange={(value) => value && actions.setDepartamento(value)}
        value={state.departamento ?? ""}
      >
        <SelectTrigger className="w-full min-w-48 bg-background dark:bg-card">
          <SelectValue placeholder="Departamento" />
        </SelectTrigger>
        <SelectContent>
          {meta.departamentos.map((departamento) => (
            <SelectItem key={departamento} value={departamento}>
              {departamento}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        disabled={!state.departamento}
        key={`city-${state.departamento}`}
        onValueChange={(value) => {
          if (!value) return;
          actions.setCiudad(value);
          onCitySelected?.();
        }}
        value={state.ciudad ?? ""}
      >
        <SelectTrigger className="w-full min-w-48 bg-background dark:bg-card">
          <SelectValue placeholder="Ciudad" />
        </SelectTrigger>
        <SelectContent>
          {meta.citiesForSelected.map((city) => (
            <SelectItem key={city} value={city}>
              {city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
