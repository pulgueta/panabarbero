import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

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

// No persistent storage: rely on search params only

export const LocationGate = () => {
  const search = useSearch({ from: "/barbershops/" });
  const navigate = useNavigate({ from: "/barbershops" });

  const [open, setOpen] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [citiesMap, setCitiesMap] = useState<Record<string, string[]>>({});
  const [state, setState] = useState<string | undefined>();
  const [city, setCity] = useState<string | undefined>();

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    const hasSearch = !!search.city && !!search.state;

    if (!hasSearch) {
      setOpen(true);
    }

    setCity(search.city);
    setState(search.state);
  }, []);

  // Fetch departments/cities once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          "https://raw.githubusercontent.com/marcovega/colombia-json/master/colombia.json",
        );
        const data: { departamento: string; ciudades: string[] }[] =
          await res.json();
        setDepartments(data.map((d) => d.departamento));
        const map: Record<string, string[]> = {};
        for (const d of data) map[d.departamento] = d.ciudades;
        setCitiesMap(map);
      } catch (e) {
        console.error("Failed to load locations", e);
      }
    })();
  }, []);

  const availableCities = useMemo(() => {
    return state ? (citiesMap[state] ?? []) : [];
  }, [state, citiesMap]);

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
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
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
