import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
      mutateAsync: updateBarbershopDayAvailability,
      isPending: isUpdatingAvailability,
      isSuccess: isUpdatedAvailability,
    },
  } = useBarbershopActions();

  const buildInitialRows = useCallback(
    (avail?: Barbershop["availability"]) =>
      days.map((d) => {
        const found = avail?.find((r) => r.weekDay.day === d.key);

        return (
          found ?? {
            weekDay: { day: d.key, isActive: false },
            openAt: "",
            closeAt: "",
          }
        );
      }),
    [],
  );

  const [rows, setRows] = useState<Barbershop["availability"]>(() =>
    buildInitialRows(availability),
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

  useEffect(() => {
    if (isUpdatedAvailability) {
      toast.success("Guardado exitosamente", {
        description: "La disponibilidad se ha actualizado correctamente.",
      });
    }
  }, [isUpdatedAvailability]);

  return (
    <div className="w-full space-y-4">
      <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-3">
        {days.map((d, idx) => {
          const row = rows[idx];
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
                        next[idx] = {
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
                        next[idx] = {
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
                        next[idx] = {
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
                  disabled={isUpdatingAvailability}
                >
                  {isUpdatingAvailability ? <Spinner /> : "Guardar"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
