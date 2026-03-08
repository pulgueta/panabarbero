import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useColombia } from "@/hooks/use-colombia";
import { useLocationStore } from "@/store/barbershop-filters";

export const LocationGate = () => {
  const search = useSearch({ from: "/barbershops/" });
  const navigate = useNavigate({ from: "/barbershops/" });
  const state = useLocationStore((s) => s.state);
  const city = useLocationStore((s) => s.city);
  const setLocationState = useLocationStore((s) => s.setState);
  const setLocationCity = useLocationStore((s) => s.setCity);

  const { states, citiesFromState } = useColombia();

  // If the URL is missing location but the store (localStorage) already has it,
  // silently navigate to populate the URL — no dialog needed.
  useEffect(() => {
    if ((!search.state || !search.city) && state && city) {
      navigate({
        to: ".",
        search: (prev) => ({ ...prev, state, city }),
        replace: true,
      });
    }
  }, [search.state, search.city, state, city, navigate]);

  // Sync URL → store when URL changes externally (direct link, browser back/forward).
  useEffect(() => {
    if (search.state && search.state !== state) {
      setLocationState(search.state);
    }
    if (search.city && search.city !== city) {
      setLocationCity(search.city);
    }
  }, [
    search.city,
    search.state,
    state,
    city,
    setLocationState,
    setLocationCity,
  ]);

  const availableCities = state ? citiesFromState?.(state) : [];

  // Only show dialog when both URL AND store lack a location.
  const isLocationMissing =
    (!search.state || !search.city) && (!state || !city);

  return (
    <AlertDialog open={isLocationMissing}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Dónde te encuentras?</AlertDialogTitle>
          <AlertDialogDescription>
            Selecciona tu departamento y ciudad para mostrar las barberías más
            cercanas.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4">
          <Select
            value={state ?? ""}
            onValueChange={(v) => {
              setLocationState(v || undefined);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              {states.map((d) => (
                <SelectItem key={d.state} value={d.state}>
                  {d.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            disabled={!state}
            value={city ?? ""}
            onValueChange={(v) => setLocationCity(v || undefined)}
          >
            <SelectTrigger className="w-full">
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
      </AlertDialogContent>
    </AlertDialog>
  );
};
