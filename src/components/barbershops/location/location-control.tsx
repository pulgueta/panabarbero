import { MapPinIcon, NavigationArrowIcon } from "@phosphor-icons/react";
import { lazy, Suspense, useState } from "react";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useLocation } from "./location-provider";

const LocationMap = lazy(() =>
  import("./location-map").then((mod) => ({ default: mod.LocationMap })),
);

function LocationSelects({ onCitySelected }: { onCitySelected?: () => void }) {
  const { state, actions, meta } = useLocation();

  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
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

/**
 * Persistent location selector. Desktop shows inline departamento/ciudad
 * selects; mobile shows a tap-to-change trigger that opens a Drawer with the
 * selects, native geolocation, and a confirm-on-map flow.
 */
export function LocationControl() {
  const { state, actions, meta } = useLocation();
  const { trigger } = useWebHaptics();
  const [open, setOpen] = useState(false);

  const label = meta.hasLocation
    ? `${state.ciudad}, ${state.departamento}`
    : "Elige tu ubicación";

  const handleLocate = () => {
    trigger();
    actions.requestGeolocation();
  };

  const handleConfirm = () => {
    trigger();
    actions.confirmPin();
    setOpen(false);
  };

  return (
    <>
      <div className="hidden md:block">
        <LocationSelects />
      </div>

      <div className="md:hidden">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => {
            trigger();
            setOpen(true);
          }}
          variant="outline"
        >
          <MapPinIcon className="text-primary" weight="fill" />
          <span className="truncate">{label}</span>
        </Button>

        <Drawer onOpenChange={setOpen} open={open}>
          <DrawerContent className="px-4 pb-4">
            <DrawerHeader className="px-0">
              <DrawerTitle>¿Dónde te encuentras?</DrawerTitle>
              <DrawerDescription>
                Usa tu ubicación o elige tu departamento y ciudad.
              </DrawerDescription>
            </DrawerHeader>

            <div className="space-y-4">
              <Button
                className="w-full"
                disabled={state.status === "prompting"}
                onClick={handleLocate}
              >
                {state.status === "prompting" ? (
                  <Spinner />
                ) : (
                  <NavigationArrowIcon weight="fill" />
                )}
                Usar mi ubicación
              </Button>

              {state.coords ? (
                <Suspense
                  fallback={<Skeleton className="h-60 w-full rounded-xl" />}
                >
                  <LocationMap />
                </Suspense>
              ) : null}

              {state.pendingMatch?.ciudad ? (
                <Button
                  className="w-full"
                  onClick={handleConfirm}
                  variant="secondary"
                >
                  <MapPinIcon weight="fill" />
                  Confirmar {state.pendingMatch.ciudad}
                </Button>
              ) : null}

              <LocationSelects onCitySelected={() => setOpen(false)} />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
