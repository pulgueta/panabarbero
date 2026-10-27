import {
  FunnelSimpleIcon,
  MapPinIcon,
  NavigationArrowIcon,
  StarIcon,
} from "@phosphor-icons/react";
import type { FC } from "react";
import { useState } from "react";
import { useWebHaptics } from "web-haptics/react";

import {
  LocationMapSuspense,
  LocationSelects,
} from "@/components/barbershops/location/location-control";
import { useLocation } from "@/components/barbershops/location/location-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { BarbershopSort } from "@/lib/barbershop-sort";

export interface BarbershopRatingFilters {
  /** Minimum average rating (0 = any). */
  minRating: number;
  /** Minimum published-review count (0 = any). */
  minReviews: number;
}

export const EMPTY_RATING_FILTERS: BarbershopRatingFilters = {
  minRating: 0,
  minReviews: 0,
};

const RATING_OPTIONS = [
  { value: 0, label: "Todas" },
  { value: 3, label: "3+" },
  { value: 4, label: "4+" },
  { value: 4.5, label: "4.5+" },
] as const;

const REVIEWS_OPTIONS = [
  { value: 0, label: "Todas" },
  { value: 10, label: "10+" },
  { value: 25, label: "25+" },
  { value: 50, label: "50+" },
] as const;

/** `items` for the Base UI selects so the trigger shows labels, not values. */
const RATING_SELECT_ITEMS = RATING_OPTIONS.map((option) => ({
  value: String(option.value),
  label: option.value === 0 ? "Todas" : `${option.label} estrellas`,
}));

const REVIEWS_SELECT_ITEMS = REVIEWS_OPTIONS.map((option) => ({
  value: String(option.value),
  label: option.value === 0 ? "Todas" : `${option.label} reseñas`,
}));

const SORT_SELECT_ITEMS: { value: BarbershopSort; label: string }[] = [
  { value: "rating", label: "Mejor calificadas" },
  { value: "reviews", label: "Más reseñas" },
  { value: "name", label: "Nombre (A–Z)" },
];

interface BarbershopSortSelectProps {
  value: BarbershopSort;
  onValueChange: (value: BarbershopSort) => void;
}

export const BarbershopSortSelect: FC<BarbershopSortSelectProps> = ({
  value,
  onValueChange,
}) => (
  <Select
    items={SORT_SELECT_ITEMS}
    onValueChange={(next) => next && onValueChange(next as BarbershopSort)}
    value={value}
  >
    <SelectTrigger
      aria-label="Ordenar barberías"
      className="w-44 bg-background dark:bg-card"
    >
      <SelectValue placeholder="Ordenar" />
    </SelectTrigger>
    <SelectContent>
      {SORT_SELECT_ITEMS.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

interface BarbershopFiltersProps {
  filters: BarbershopRatingFilters;
  onFiltersChange: (filters: BarbershopRatingFilters) => void;
}

/**
 * Desktop filter bar: departamento/ciudad (URL-synced via `LocationProvider`)
 * plus client-side rating/review-count filters and a full reset.
 */
export const BarbershopFilters: FC<BarbershopFiltersProps> = ({
  filters,
  onFiltersChange,
}) => {
  const { actions, meta } = useLocation();

  const hasActiveFilters =
    meta.hasLocation || filters.minRating > 0 || filters.minReviews > 0;

  // One navigation clearing location + rating filters — two navigations
  // (onFiltersChange + reset) would race on the same `prev` search.
  const clearAll = () => {
    actions.applyFilters({
      departamento: undefined,
      ciudad: undefined,
      ...EMPTY_RATING_FILTERS,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LocationSelects className="max-w-md flex-1 gap-2" />

      <Select
        items={RATING_SELECT_ITEMS}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, minRating: Number(value ?? 0) })
        }
        value={filters.minRating > 0 ? String(filters.minRating) : ""}
      >
        <SelectTrigger className="w-40 bg-background dark:bg-card">
          <SelectValue placeholder="Calificación" />
        </SelectTrigger>
        <SelectContent>
          {RATING_SELECT_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={REVIEWS_SELECT_ITEMS}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, minReviews: Number(value ?? 0) })
        }
        value={filters.minReviews > 0 ? String(filters.minReviews) : ""}
      >
        <SelectTrigger className="w-40 bg-background dark:bg-card">
          <SelectValue placeholder="Reseñas" />
        </SelectTrigger>
        <SelectContent>
          {REVIEWS_SELECT_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button onClick={clearAll} variant="ghost">
          Limpiar
        </Button>
      )}
    </div>
  );
};

interface DraftFilters extends BarbershopRatingFilters {
  departamento: string | undefined;
  ciudad: string | undefined;
}

export const BarbershopFiltersDrawer: FC<
  Pick<BarbershopFiltersProps, "filters">
> = ({ filters }) => {
  const { state, actions, meta } = useLocation();
  const { trigger } = useWebHaptics();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftFilters>({
    ...filters,
    departamento: state.departamento,
    ciudad: state.ciudad,
  });

  const activeCount =
    (meta.hasLocation ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.minReviews > 0 ? 1 : 0);

  const draftCities = meta.citiesFor(draft.departamento);

  // The listing query needs a complete location, so a departamento on its own
  // can't be committed — keep "Aplicar" disabled until a ciudad is picked.
  // A fully empty draft is fine: applying it resets the listing back to the
  // location picker (this is how "Limpiar" gets committed).
  const canApply =
    Boolean(draft.departamento && draft.ciudad) ||
    (!draft.departamento && !draft.ciudad);

  const openDrawer = () => {
    trigger();
    setDraft({
      minRating: filters.minRating,
      minReviews: filters.minReviews,
      departamento: state.departamento,
      ciudad: state.ciudad,
    });
    setOpen(true);
  };

  const apply = () => {
    if (!canApply) return;
    trigger();
    actions.applyFilters(draft);
    setOpen(false);
  };

  const clear = () => {
    trigger();
    setDraft({
      ...EMPTY_RATING_FILTERS,
      departamento: undefined,
      ciudad: undefined,
    });
  };

  const handleLocate = () => {
    trigger();
    actions.requestGeolocation();
  };

  const handleConfirmPin = () => {
    if (!state.pendingMatch?.ciudad) return;
    trigger();
    actions.applyFilters({
      departamento: state.pendingMatch.departamento,
      ciudad: state.pendingMatch.ciudad,
      minRating: draft.minRating,
      minReviews: draft.minReviews,
    });
    setOpen(false);
  };

  return (
    <>
      <Button onClick={openDrawer} variant="outline">
        <FunnelSimpleIcon />
        Filtros
        {activeCount > 0 && <Badge className="ml-0.5">{activeCount}</Badge>}
      </Button>

      <Drawer onOpenChange={setOpen} open={open}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filtros</DrawerTitle>
            <DrawerDescription>
              Ajusta la búsqueda y toca aplicar.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-5 overflow-y-auto px-4 pb-4">
            <div className="space-y-3">
              <Button
                className="w-full"
                disabled={state.status === "prompting"}
                onClick={handleLocate}
                variant="secondary"
              >
                {state.status === "prompting" ? (
                  <Spinner />
                ) : (
                  <NavigationArrowIcon weight="fill" />
                )}
                Usar mi ubicación
              </Button>

              {state.coords ? <LocationMapSuspense /> : null}

              {state.pendingMatch?.ciudad ? (
                <Button className="w-full" onClick={handleConfirmPin}>
                  <MapPinIcon weight="fill" />
                  Confirmar {state.pendingMatch.ciudad}
                </Button>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="font-medium text-sm">Departamento</p>
              <Select
                onValueChange={(value) =>
                  value &&
                  setDraft((prev) => ({
                    ...prev,
                    departamento: value,
                    ciudad: undefined,
                  }))
                }
                value={draft.departamento ?? ""}
              >
                <SelectTrigger className="w-full bg-background dark:bg-card">
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
            </div>

            <div className="space-y-2">
              <p className="font-medium text-sm">Ciudad</p>
              <Select
                disabled={!draft.departamento}
                key={`city-${draft.departamento}`}
                onValueChange={(value) =>
                  value && setDraft((prev) => ({ ...prev, ciudad: value }))
                }
                value={draft.ciudad ?? ""}
              >
                <SelectTrigger className="w-full bg-background dark:bg-card">
                  <SelectValue placeholder="Ciudad" />
                </SelectTrigger>
                <SelectContent>
                  {draftCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-sm">Calificación mínima</p>
              <div className="flex gap-2">
                {RATING_OPTIONS.map((option) => (
                  <Button
                    aria-pressed={draft.minRating === option.value}
                    className="flex-1"
                    key={option.value}
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, minRating: option.value }))
                    }
                    variant={
                      draft.minRating === option.value ? "default" : "outline"
                    }
                  >
                    {option.value > 0 && <StarIcon weight="fill" />}
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-medium text-sm">Cantidad de reseñas</p>
              <div className="flex gap-2">
                {REVIEWS_OPTIONS.map((option) => (
                  <Button
                    aria-pressed={draft.minReviews === option.value}
                    className="flex-1"
                    key={option.value}
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        minReviews: option.value,
                      }))
                    }
                    variant={
                      draft.minReviews === option.value ? "default" : "outline"
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DrawerFooter className="gap-2 border-t px-4 pt-3">
            {!canApply && (
              <p className="text-center text-muted-foreground text-xs">
                Elige departamento y ciudad para aplicar.
              </p>
            )}
            <div className="flex flex-row gap-2">
              <Button className="flex-1" onClick={clear} variant="outline">
                Limpiar
              </Button>
              <Button className="flex-2" disabled={!canApply} onClick={apply}>
                Aplicar
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};
