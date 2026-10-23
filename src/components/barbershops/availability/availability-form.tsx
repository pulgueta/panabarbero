import type { Barbershop } from "@convex/schema";
import type { FC } from "react";
import { Activity, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useBarbershopActions } from "@/hooks/barbershop/use-barbershop";
import { isTimeRangeValid } from "@/lib/schedule-utils";

type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

const days: Array<{ key: DayKey; label: string; short: string }> = [
  { key: "monday", label: "Lunes", short: "Lun" },
  { key: "tuesday", label: "Martes", short: "Mar" },
  { key: "wednesday", label: "Miércoles", short: "Mié" },
  { key: "thursday", label: "Jueves", short: "Jue" },
  { key: "friday", label: "Viernes", short: "Vie" },
  { key: "saturday", label: "Sábado", short: "Sáb" },
  { key: "sunday", label: "Domingo", short: "Dom" },
];

function isDayKey(value: string): value is DayKey {
  return days.some((entry) => entry.key === value);
}

function dayLabel(day: DayKey): string {
  return days.find((entry) => entry.key === day)?.label ?? day;
}

type AvailabilityRow = Barbershop["availability"][number];

interface ScheduleDraft {
  openAt: string;
  closeAt: string;
  lunchStart: string;
  lunchEnd: string;
}

const emptySchedule: ScheduleDraft = {
  openAt: "",
  closeAt: "",
  lunchStart: "",
  lunchEnd: "",
};

function buildInitialRows(avail?: Barbershop["availability"]) {
  return days.map((d) => {
    const found = avail?.find((r) => r.weekDay.day === d.key);

    return (
      found ?? {
        weekDay: { day: d.key, isActive: false },
        openAt: "",
        closeAt: "",
        lunchStart: undefined,
        lunchEnd: undefined,
      }
    );
  });
}

function activeDayKeys(rows: Barbershop["availability"]): DayKey[] {
  return rows.flatMap((entry) =>
    entry.weekDay.isActive ? [entry.weekDay.day] : [],
  );
}

/** The editor loads the hours of the first selected day. */
function findScheduleBase(
  rows: Barbershop["availability"],
  selectedDays: DayKey[],
): AvailabilityRow | undefined {
  return rows.find((entry) => entry.weekDay.day === selectedDays[0]);
}

function scheduleFromRow(base: AvailabilityRow): ScheduleDraft {
  return {
    openAt: base.openAt ?? "",
    closeAt: base.closeAt ?? "",
    lunchStart: base.lunchStart ?? "",
    lunchEnd: base.lunchEnd ?? "",
  };
}

function formatTime(value?: string) {
  return value && value.trim().length > 0 ? value : undefined;
}

function validateEntry(entry: AvailabilityRow): AvailabilityRow {
  const lunchStart = formatTime(entry.lunchStart);
  const lunchEnd = formatTime(entry.lunchEnd);

  if (entry.weekDay.isActive) {
    if (!entry.openAt || !entry.closeAt) {
      throw new Error(
        `Define el horario disponible para ${dayLabel(entry.weekDay.day)}`,
      );
    }

    if (!isTimeRangeValid(entry.openAt, entry.closeAt)) {
      throw new Error(
        `La hora de disponibilidad final debe ser mayor a la hora inicial para ${dayLabel(entry.weekDay.day)}`,
      );
    }
  }

  if ((lunchStart && !lunchEnd) || (!lunchStart && lunchEnd)) {
    throw new Error(`Completa ambas horas para ${dayLabel(entry.weekDay.day)}`);
  }

  if (lunchStart && lunchEnd && !isTimeRangeValid(lunchStart, lunchEnd)) {
    throw new Error(
      `La hora de disponibilidad nuevamente debe ser mayor a la hora de no disponibilidad para ${dayLabel(entry.weekDay.day)}`,
    );
  }

  return {
    weekDay: entry.weekDay,
    openAt: entry.openAt ?? "",
    closeAt: entry.closeAt ?? "",
    lunchStart,
    lunchEnd,
  };
}

interface AvailabilityFormProps {
  barbershopId: Barbershop["_id"];
  availability: Barbershop["availability"];
}

// oxlint-disable-next-line react-doctor/no-giant-component -- pre-existing large component; split tracked as a follow-up in odd/tasks/oxc-migration.md
export const AvailabilityForm: FC<AvailabilityFormProps> = ({
  barbershopId,
  availability,
}) => {
  const formIds = {
    disableHours: useId(),
    availability: useId(),
    openAt: useId(),
    closeAt: useId(),
    lunchStart: useId(),
    lunchEnd: useId(),
  };
  const haptic = useWebHaptics();

  const {
    updateBarbershopAvailabilityMutation: {
      mutateAsync: updateBarbershopAvailability,
      isPending: isUpdatingAvailability,
    },
  } = useBarbershopActions();

  const [rows, setRows] = useState<Barbershop["availability"]>(() =>
    buildInitialRows(availability),
  );

  const [selectedDays, setSelectedDays] = useState<DayKey[]>(() =>
    activeDayKeys(buildInitialRows(availability)),
  );
  const [schedule, setSchedule] = useState<ScheduleDraft>(() => {
    const initialRows = buildInitialRows(availability);
    const base = findScheduleBase(initialRows, activeDayKeys(initialRows));
    return base ? scheduleFromRow(base) : emptySchedule;
  });
  const [hasLunch, setHasLunch] = useState(() => {
    const initialRows = buildInitialRows(availability);
    const base = findScheduleBase(initialRows, activeDayKeys(initialRows));
    return Boolean(base?.lunchStart && base.lunchEnd);
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const initialRows = useMemo(
    () => buildInitialRows(availability),
    [availability],
  );

  const hasChanges = useMemo(() => {
    if (initialRows.length !== rows.length) return true;

    return rows.some((row, index) => {
      const initial = initialRows[index];
      if (!initial) return true;

      return (
        row.weekDay.isActive !== initial.weekDay.isActive ||
        row.openAt !== initial.openAt ||
        row.closeAt !== initial.closeAt ||
        row.lunchStart !== initial.lunchStart ||
        row.lunchEnd !== initial.lunchEnd
      );
    });
  }, [rows, initialRows]);

  // Re-sync the local rows when the saved availability changes.
  const [syncedAvailability, setSyncedAvailability] = useState(availability);
  if (syncedAvailability !== availability) {
    setSyncedAvailability(availability);
    const nextRows = buildInitialRows(availability);
    setRows(nextRows);
    setSelectedDays(activeDayKeys(nextRows));
  }

  // Load the first selected day's hours whenever the rows or the selection change.
  const [scheduleSource, setScheduleSource] = useState({ rows, selectedDays });
  if (
    scheduleSource.rows !== rows ||
    scheduleSource.selectedDays !== selectedDays
  ) {
    setScheduleSource({ rows, selectedDays });
    const base = findScheduleBase(rows, selectedDays);
    if (base) {
      setSchedule(scheduleFromRow(base));
      setHasLunch(Boolean(base.lunchStart && base.lunchEnd));
    }
  }

  const handleSelectedDaysChange = (values: string[]) => {
    const typed = values.filter(isDayKey);

    setSelectedDays(typed);
    setFormError(null);
  };

  const applyScheduleToSelectedDays = () => {
    if (!selectedDays.length) {
      setFormError("Selecciona al menos un día");

      return;
    }

    if (!schedule.openAt || !schedule.closeAt) {
      setFormError("Debes definir el horario disponible");

      return;
    }

    if (!isTimeRangeValid(schedule.openAt, schedule.closeAt)) {
      setFormError(
        "La hora de disponibilidad final debe ser mayor a la hora inicial",
      );

      return;
    }

    if (hasLunch) {
      if (!schedule.lunchStart || !schedule.lunchEnd) {
        setFormError("Completa ambas horas");

        return;
      }

      if (!isTimeRangeValid(schedule.lunchStart, schedule.lunchEnd)) {
        setFormError(
          "La hora de disponibilidad nuevamente debe ser mayor a la hora de no disponibilidad",
        );

        return;
      }
    }

    const selected = new Set(selectedDays);
    setRows((prev) =>
      prev.map((entry) =>
        selected.has(entry.weekDay.day)
          ? {
              ...entry,
              weekDay: { ...entry.weekDay, isActive: true },
              openAt: schedule.openAt,
              closeAt: schedule.closeAt,
              lunchStart: hasLunch ? schedule.lunchStart : undefined,
              lunchEnd: hasLunch ? schedule.lunchEnd : undefined,
            }
          : entry,
      ),
    );

    setFormError(null);
  };

  const disableSelectedDays = () => {
    if (!selectedDays.length) {
      setFormError("Selecciona al menos un día");

      return;
    }

    const selected = new Set(selectedDays);
    setRows((prev) =>
      prev.map((entry) =>
        selected.has(entry.weekDay.day)
          ? {
              ...entry,
              weekDay: { ...entry.weekDay, isActive: false },
            }
          : entry,
      ),
    );

    toast.info("Los días seleccionados ahora están inactivos");
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const validatedRows = rows.map((entry) => validateEntry(entry));

      await updateBarbershopAvailability({
        barbershop: { id: barbershopId },
        data: { availability: validatedRows },
      });

      void haptic.trigger("success");
      toast.success("Disponibilidad actualizada correctamente");
    } catch (error) {
      void haptic.trigger("error");
      toast.error(
        error instanceof Error
          ? error.message
          : "No pudimos guardar la disponibilidad",
      );
    }

    setIsSaving(false);
  };

  return (
    <div className="w-full space-y-4">
      <FieldGroup>
        <FieldSet className="gap-2">
          <Field>
            <ToggleGroup
              multiple
              variant="outline"
              value={selectedDays}
              onValueChange={handleSelectedDaysChange}
              className="flex max-w-max flex-wrap justify-start"
              aria-label="Selecciona los días para aplicar el horario"
            >
              {days.map(({ key, label }) => (
                <ToggleGroupItem
                  key={key}
                  value={key}
                  className="px-3"
                  aria-pressed={selectedDays.includes(key)}
                >
                  <span className="block md:hidden">{label.slice(0, 3)}</span>
                  <span className="hidden md:block">{label}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          <FieldDescription className="flex flex-col gap-1">
            <span>
              Selecciona los días en los que quieres aplicar el horario deseado.
            </span>
            <span className="text-muted-foreground text-sm">
              {selectedDays.length}{" "}
              {selectedDays.length === 1
                ? "día seleccionado"
                : "días seleccionados"}
            </span>
          </FieldDescription>
          {formError && <FieldError>{formError}</FieldError>}
        </FieldSet>

        <div className="flex w-full flex-col gap-4 md:flex-row">
          <FieldSet className="w-full">
            <Field>
              <FieldLabel htmlFor={formIds.openAt}>Disponible desde</FieldLabel>
              <Input
                id={formIds.openAt}
                type="time"
                value={schedule.openAt}
                onChange={(e) =>
                  setSchedule((prev) => ({ ...prev, openAt: e.target.value }))
                }
              />
              <FieldDescription>
                Los clientes podrán agendar citas a partir de esta hora.
              </FieldDescription>
            </Field>
          </FieldSet>

          <FieldSet className="w-full">
            <Field>
              <FieldLabel htmlFor={formIds.closeAt}>
                Disponible hasta
              </FieldLabel>
              <Input
                id={formIds.closeAt}
                type="time"
                value={schedule.closeAt}
                onChange={(e) =>
                  setSchedule((prev) => ({ ...prev, closeAt: e.target.value }))
                }
              />
              <FieldDescription>
                Los clientes podrán agendar citas hasta esta hora.
              </FieldDescription>
            </Field>
          </FieldSet>
        </div>

        <FieldSet>
          <Field orientation="horizontal">
            <Checkbox
              checked={hasLunch}
              onCheckedChange={(checked) => setHasLunch(checked)}
              id={formIds.disableHours}
            />
            <FieldContent>
              <FieldLabel htmlFor={formIds.disableHours}>
                Deshabilitar horas
              </FieldLabel>
              <FieldDescription>
                Si seleccionas, los clientes no podrán agendar citas durante el
                rango de tiempo seleccionado.
              </FieldDescription>
            </FieldContent>
          </Field>
        </FieldSet>

        <Activity mode={hasLunch ? "visible" : "hidden"}>
          <div className="flex w-full flex-col gap-4 md:flex-row">
            <FieldSet className="w-full">
              <Field>
                <FieldLabel htmlFor={formIds.lunchStart}>Inicio</FieldLabel>
                <Input
                  id={formIds.lunchStart}
                  type="time"
                  value={schedule.lunchStart}
                  onChange={(e) =>
                    setSchedule((prev) => ({
                      ...prev,
                      lunchStart: e.target.value,
                    }))
                  }
                />
              </Field>
              <FieldDescription>
                Los clientes no podrán agendar citas a partir de esta hora.
              </FieldDescription>
            </FieldSet>

            <FieldSet className="w-full">
              <Field>
                <FieldLabel htmlFor={formIds.lunchEnd}>Fin</FieldLabel>
                <Input
                  id={formIds.lunchEnd}
                  type="time"
                  value={schedule.lunchEnd}
                  onChange={(e) =>
                    setSchedule((prev) => ({
                      ...prev,
                      lunchEnd: e.target.value,
                    }))
                  }
                />
              </Field>
              <FieldDescription>
                Los clientes podrán agendar citas nuevamente a partir de esta
                hora.
              </FieldDescription>
            </FieldSet>
          </div>
        </Activity>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Button
            type="button"
            variant="secondary"
            onClick={applyScheduleToSelectedDays}
          >
            Aplicar horario
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={isSaving || isUpdatingAvailability || !hasChanges}
          >
            {(isSaving || isUpdatingAvailability) && <Spinner />} Guardar
            cambios
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={disableSelectedDays}
            disabled={!selectedDays.length}
          >
            Desactivar días seleccionados
          </Button>
        </div>

        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold text-sm">Resumen de disponibilidad</h3>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7">
            {rows.map((entry) => {
              const day = entry.weekDay.day;

              return (
                <div key={day} className="rounded-md bg-muted/40 p-3 text-sm">
                  <p className="font-semibold">{dayLabel(day)}</p>

                  {entry.weekDay.isActive ? (
                    <div className="text-muted-foreground">
                      <p>
                        {entry.openAt} – {entry.closeAt}
                      </p>
                      {entry.lunchStart && entry.lunchEnd && (
                        <p>
                          No disponible durante: {entry.lunchStart} –{" "}
                          {entry.lunchEnd}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Inactivo</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </FieldGroup>
    </div>
  );
};
