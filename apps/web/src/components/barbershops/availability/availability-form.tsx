import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useBarbershopActions } from "@/hooks/use-barbershop";

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
  availability,
}) => {
  const {
    updateBarbershopDayAvailabilityMutation: {
      isPending: isUpdatingAvailability,
      mutateAsync: updateBarbershopDayAvailability,
    },
  } = useBarbershopActions();

  const [rows, setRows] = useState<Barbershop["availability"]>(
    availability ?? [],
  );

  const saveRow = async (day: DayKey) => {
    const entry = rows?.find((r) => r.weekDay.day === day);
    if (!entry) return;
    await updateBarbershopDayAvailability({
      barbershopId,
      day,
      isActive: entry.weekDay.isActive,
      openAt: entry.openAt,
      closeAt: entry.closeAt,
    });
  };

  return (
    <div className="w-full space-y-4">
      <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-3">
        {days.map((d) => {
          const row = rows?.find((r) => r.weekDay.day === d.key);

          if (!row) return null;

          return (
            <div key={d.key} className="grid grid-cols-1 items-end gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{d.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={row.weekDay.isActive}
                    onCheckedChange={(v) =>
                      setRows((prev) => {
                        const next = [...prev];

                        next[next.findIndex((r) => r.weekDay.day === d.key)] = {
                          ...row,
                          weekDay: { ...row.weekDay, isActive: v },
                        };

                        return next;
                      })
                    }
                  />
                  <span className="text-muted-foreground text-sm">Activo</span>
                </div>
              </div>
              <div className="space-y-4">
                <Field>
                  <FieldLabel>Apertura</FieldLabel>
                  <Input
                    type="time"
                    value={row.openAt ?? ""}
                    onChange={(e) =>
                      setRows((prev) => {
                        const next = [...prev];

                        next[next.findIndex((r) => r.weekDay.day === d.key)] = {
                          ...row,
                          openAt: e.target.value,
                        };

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
                        const next = [...prev];

                        next[next.findIndex((r) => r.weekDay.day === d.key)] = {
                          ...row,
                          closeAt: e.target.value,
                        };

                        return next;
                      })
                    }
                  />
                </Field>

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
