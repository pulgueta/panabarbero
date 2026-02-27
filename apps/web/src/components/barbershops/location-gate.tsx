import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
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
import {
  setLocationCity,
  setLocationState,
  useLocationStore,
} from "@/store/location";

export const LocationGate = () => {
  const search = useSearch({ from: "/barbershops/" });
  const navigate = useNavigate({ from: "/barbershops/" });
  const { state, city } = useLocationStore();

  const { states, citiesFromState } = useColombia();

  useEffect(() => {
    if (search.state && search.state !== state) {
      setLocationState(search.state);
    }
    if (search.city && search.city !== city) {
      setLocationCity(search.city);
    }
  }, [search.city, search.state, state, city]);

  const availableCities = state ? citiesFromState?.(state) : [];
  const isLocationMissing = !search.state || !search.city;

  const confirm = () => {
    if (!state || !city) return;

    navigate({ to: ".", search: (prev) => ({ ...prev, state, city }) });
  };

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

        <AlertDialogFooter>
          <AlertDialogAction onClick={confirm} disabled={!state || !city}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
