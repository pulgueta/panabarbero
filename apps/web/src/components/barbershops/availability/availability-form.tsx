import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useBarbershopActions } from "@/hooks/use-barbershop";
import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { useMemo, useState } from "react";

type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

const days: Array<{ key: DayKey; label: string }> = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

interface AvailabilityFormProps {
  barbershopId: Barbershop["_id"];
  availability?: Barbershop["availability"];
}

export const AvailabilityForm: FC<AvailabilityFormProps> = ({
  barbershopId,
  availability = [],
}) => {
  const { updateBarbershopDayAvailability } = useBarbershopActions();

  const initialMap = useMemo(() => {
    const m = new Map<
      DayKey,
      { isActive: boolean; openAt?: string; closeAt?: string }
    >();
    days.forEach((d) => {
      const found = availability.find((a) => a.weekDay.day === d.key);
      if (found) {
        m.set(d.key, {
          isActive: found.weekDay.isActive,
          openAt: found.openAt,
          closeAt: found.closeAt,
        });
      } else {
        m.set(d.key, { isActive: false, openAt: "", closeAt: "" });
      }
    });
    return m;
  }, [availability]);

  const [selected, setSelected] = useState<Record<DayKey, boolean>>({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false,
    saturday: false,
    sunday: false,
  });
  const [batchOpenAt, setBatchOpenAt] = useState<string>("");
  const [batchCloseAt, setBatchCloseAt] = useState<string>("");
  const [rows, setRows] =
    useState<
      Map<DayKey, { isActive: boolean; openAt?: string; closeAt?: string }>
    >(initialMap);

  const applyToSelected = async () => {
    const promises: Array<Promise<unknown>> = [];
    (Object.keys(selected) as DayKey[]).forEach((k) => {
      if (selected[k]) {
        promises.push(
          updateBarbershopDayAvailability.mutateAsync({
            barbershopId,
            day: k,
            isActive: true,
            openAt: batchOpenAt || rows.get(k)?.openAt || "",
            closeAt: batchCloseAt || rows.get(k)?.closeAt || "",
          }),
        );
        setRows((prev) => {
          const next = new Map(prev);
          next.set(k, {
            isActive: true,
            openAt: batchOpenAt || prev.get(k)?.openAt,
            closeAt: batchCloseAt || prev.get(k)?.closeAt,
          });
          return next;
        });
      }
    });
    await Promise.all(promises);
  };

  const saveRow = async (day: DayKey) => {
    const entry = rows.get(day);
    if (!entry) return;
    await updateBarbershopDayAvailability.mutateAsync({
      barbershopId,
      day,
      isActive: entry.isActive,
      openAt: entry.openAt,
      closeAt: entry.closeAt,
    });
  };

  return (
    <div className="w-full space-y-4">
      <FieldGroup>
        <div className="rounded-md border p-4">
          <div className="mb-2 font-medium">
            Aplicar horas a los días seleccionados
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Field>
              <FieldLabel>Hora de apertura</FieldLabel>
              <Input
                type="time"
                value={batchOpenAt}
                onChange={(e) => setBatchOpenAt(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel>Hora de cierre</FieldLabel>
              <Input
                type="time"
                value={batchCloseAt}
                onChange={(e) => setBatchCloseAt(e.target.value)}
              />
            </Field>
            <div className="flex items-end">
              <Button className="w-full" onClick={applyToSelected}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </FieldGroup>

      <Separator />

      <div className="w-full space-y-8">
        {days.map((d) => {
          const row = rows.get(d.key);

          if (!row) return null;

          return (
            <div
              key={d.key}
              className="grid grid-cols-1 items-end gap-4 md:grid-cols-4"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{d.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={row.isActive}
                    onCheckedChange={(v) =>
                      setRows((prev) => {
                        const next = new Map(prev);
                        next.set(d.key, { ...row, isActive: v });
                        return next;
                      })
                    }
                  />
                  <span className="text-muted-foreground text-sm">Activo</span>
                </div>
              </div>

              <Field>
                <FieldLabel>Apertura</FieldLabel>
                <Input
                  type="time"
                  value={row.openAt ?? ""}
                  onChange={(e) =>
                    setRows((prev) => {
                      const next = new Map(prev);
                      next.set(d.key, { ...row, openAt: e.target.value });
                      return next;
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel>Cierre</FieldLabel>
                <Input
                  type="time"
                  value={row.closeAt ?? ""}
                  onChange={(e) =>
                    setRows((prev) => {
                      const next = new Map(prev);
                      next.set(d.key, { ...row, closeAt: e.target.value });
                      return next;
                    })
                  }
                />
              </Field>
              <div className="sm:col-span-1">
                <Button
                  variant="outline"
                  onClick={() => saveRow(d.key)}
                  className="w-full"
                >
                  Guardar
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
