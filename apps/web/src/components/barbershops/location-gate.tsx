import { useColombia } from "@panabarbero/constants";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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

export const LocationGate = () => {
  const search = useSearch({ from: "/barbershops/" });
  const navigate = useNavigate({ from: "/barbershops" });

  const [state, setState] = useState<string | undefined>();
  const [city, setCity] = useState<string | undefined>();
  const [open, setOpen] = useState<boolean>(false);

  const { states, citiesFromState } = useColombia();

  useEffect(() => {
    setCity(search.city);
    setState(search.state);

    if (!open) setOpen(true);
  }, [search, open]);

  const availableCities = state ? citiesFromState?.(state) : [];

  const confirm = () => {
    if (!state || !city) return;
    navigate({ to: ".", search: (prev) => ({ ...prev, state, city }) });
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
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
              setState(v || undefined);
              setCity(undefined);
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
            onValueChange={(v) => setCity(v || undefined)}
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
