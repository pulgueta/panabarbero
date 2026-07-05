import type { Barbershop, BarbershopMemberWithName } from "@convex/schema";
import type { Dispatch, FC, SetStateAction } from "react";
import {
  Activity,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
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
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  useBarberSchedule,
  useBarbershopMemberActions,
} from "@/hooks/use-barbershop-members";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { isTimeRangeValid } from "@/lib/schedule-utils";

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

const dayLabelMap = days.reduce<Record<DayKey, string>>(
  (acc, entry) => {
    acc[entry.key] = entry.label;
    return acc;
  },
  {} as Record<DayKey, string>,
);

const validateEntry = (
  entry: Barbershop["availability"][number],
): Barbershop["availability"][number] => {
  const formatTime = (value?: string) =>
    value && value.trim().length > 0 ? value : undefined;
  const lunchStart = formatTime(entry.lunchStart);
  const lunchEnd = formatTime(entry.lunchEnd);

  if (entry.weekDay.isActive) {
    if (!entry.openAt || !entry.closeAt) {
      throw new Error(
        `Define el horario disponible para ${dayLabelMap[entry.weekDay.day as DayKey]}`,
      );
    }
    if (!isTimeRangeValid(entry.openAt, entry.closeAt)) {
      throw new Error(
        `La hora de disponibilidad final debe ser mayor a la hora inicial para ${dayLabelMap[entry.weekDay.day as DayKey]}`,
      );
    }
  }

  if ((lunchStart && !lunchEnd) || (!lunchStart && lunchEnd)) {
    throw new Error(
      `Completa ambas horas para ${dayLabelMap[entry.weekDay.day as DayKey]}`,
    );
  }
  if (lunchStart && lunchEnd && !isTimeRangeValid(lunchStart, lunchEnd)) {
    throw new Error(
      `La hora de no disponibilidad final debe ser mayor a la hora inicial para ${dayLabelMap[entry.weekDay.day as DayKey]}`,
    );
  }

  return {
    weekDay: entry.weekDay,
    openAt: entry.openAt ?? "",
    closeAt: entry.closeAt ?? "",
    lunchStart,
    lunchEnd,
  };
};

type ScheduleDraft = {
  openAt: string;
  closeAt: string;
  lunchStart: string;
  lunchEnd: string;
};

function ScheduleSummary({ rows }: { rows: Barbershop["availability"] }) {
  return (
    <Activity mode="visible">
      <div className="rounded-lg border p-4">
        <h4 className="mb-3 font-semibold text-sm">Horario personalizado</h4>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {rows.map((entry) => {
            const day = entry.weekDay.day as DayKey;

            return (
              <div key={day} className="rounded border p-3 text-sm">
                <p className="font-semibold">{dayLabelMap[day]}</p>
                {entry.weekDay.isActive ? (
                  <div className="text-muted-foreground">
                    <p>
                      {entry.openAt} – {entry.closeAt}
                    </p>
                    {entry.lunchStart && entry.lunchEnd && (
                      <p className="text-xs">
                        Pausa: {entry.lunchStart} – {entry.lunchEnd}
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
    </Activity>
  );
}

function DaySelectionField({
  selectedDays,
  onSelectedDaysChange,
  formError,
}: {
  selectedDays: DayKey[];
  onSelectedDaysChange: (values: string[]) => void;
  formError: string | null;
}) {
  return (
    <FieldSet className="gap-2">
      <Field>
        <ToggleGroup
          multiple
          variant="outline"
          value={selectedDays}
          onValueChange={onSelectedDaysChange}
          className="flex flex-wrap justify-start"
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
      <FieldDescription>
        Selecciona los días y define el horario.{" "}
        <span className="text-muted-foreground">
          {selectedDays.length}{" "}
          {selectedDays.length === 1
            ? "día seleccionado"
            : "días seleccionados"}
        </span>
      </FieldDescription>
      {formError && <FieldError>{formError}</FieldError>}
    </FieldSet>
  );
}

function TimeRangeFields({
  formIds,
  schedule,
  setSchedule,
}: {
  formIds: Pick<
    ReturnType<typeof useScheduleFieldIds>,
    "openAt" | "closeAt" | "lunchStart" | "lunchEnd"
  >;
  schedule: ScheduleDraft;
  setSchedule: Dispatch<SetStateAction<ScheduleDraft>>;
}) {
  return (
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
        </Field>
      </FieldSet>

      <FieldSet className="w-full">
        <Field>
          <FieldLabel htmlFor={formIds.closeAt}>Disponible hasta</FieldLabel>
          <Input
            id={formIds.closeAt}
            type="time"
            value={schedule.closeAt}
            onChange={(e) =>
              setSchedule((prev) => ({ ...prev, closeAt: e.target.value }))
            }
          />
        </Field>
      </FieldSet>
    </div>
  );
}

function LunchBreakFields({
  formIds,
  hasLunch,
  setHasLunch,
  schedule,
  setSchedule,
}: {
  formIds: Pick<
    ReturnType<typeof useScheduleFieldIds>,
    "disableHours" | "lunchStart" | "lunchEnd"
  >;
  hasLunch: boolean;
  setHasLunch: (value: boolean) => void;
  schedule: ScheduleDraft;
  setSchedule: Dispatch<SetStateAction<ScheduleDraft>>;
}) {
  return (
    <>
      <FieldSet>
        <Field orientation="horizontal">
          <Checkbox
            checked={hasLunch}
            onCheckedChange={(checked) => setHasLunch(Boolean(checked))}
            id={formIds.disableHours}
          />
          <FieldContent>
            <FieldLabel htmlFor={formIds.disableHours}>
              Deshabilitar horas
            </FieldLabel>
            <FieldDescription>
              Los clientes no podrán agendar citas durante el rango
              seleccionado.
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
          </FieldSet>
        </div>
      </Activity>
    </>
  );
}

function useScheduleFieldIds() {
  return {
    customToggle: useId(),
    openAt: useId(),
    closeAt: useId(),
    lunchStart: useId(),
    lunchEnd: useId(),
    disableHours: useId(),
  };
}

interface BarberScheduleEditorProps {
  member: BarbershopMemberWithName;
  onCancel?: () => void;
  onSuccess?: () => void;
}

function useBarberScheduleEditor({
  member,
  onSuccess,
}: Pick<BarberScheduleEditorProps, "member" | "onSuccess">) {
  const haptic = useWebHaptics();
  const { data: scheduleData, isLoading } = useBarberSchedule(member._id);
  const {
    updateBarberScheduleMutation: {
      mutateAsync: updateSchedule,
      isPending: isUpdating,
    },
    resetBarberScheduleMutation: {
      mutateAsync: resetSchedule,
      isPending: isResetting,
    },
  } = useBarbershopMemberActions();
  const [isCustom, setIsCustom] = useState(false);
  const buildRows = useCallback(
    (avail?: Barbershop["availability"]) =>
      days.map((d) => {
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
      }),
    [],
  );
  const [rows, setRows] = useState<Barbershop["availability"]>(() =>
    buildRows(scheduleData?.schedule),
  );
  const [selectedDays, setSelectedDays] = useState<DayKey[]>([]);
  const [schedule, setSchedule] = useState<ScheduleDraft>({
    openAt: "",
    closeAt: "",
    lunchStart: "",
    lunchEnd: "",
  });
  const [hasLunch, setHasLunch] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!scheduleData) return;
    setIsCustom(scheduleData.isCustom);
    setRows(buildRows(scheduleData.schedule));
    setSelectedDays([]);
    setFormError(null);
  }, [scheduleData, buildRows]);

  useEffect(() => {
    const base = rows.find((entry) => entry.weekDay.day === selectedDays[0]);
    if (!base) return;
    setSchedule({
      openAt: base.openAt ?? "",
      closeAt: base.closeAt ?? "",
      lunchStart: base.lunchStart ?? "",
      lunchEnd: base.lunchEnd ?? "",
    });
    setHasLunch(Boolean(base.lunchStart && base.lunchEnd));
  }, [rows, selectedDays]);

  const initialRows = useMemo(
    () => buildRows(scheduleData?.schedule),
    [scheduleData, buildRows],
  );
  const hasChanges = useMemo(() => {
    if (!isCustom && scheduleData?.isCustom) return true;
    if (isCustom && !scheduleData?.isCustom) return true;
    if (!isCustom) return false;

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
  }, [rows, initialRows, isCustom, scheduleData?.isCustom]);

  const handleSelectedDaysChange = (values: string[]) => {
    const typed = values.filter(
      (value): value is DayKey => !!dayLabelMap[value as DayKey],
    );
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
          "La hora de no disponibilidad final debe ser mayor a la hora inicial",
        );
        return;
      }
    }

    setRows((prev) =>
      prev.map((entry) =>
        selectedDays.includes(entry.weekDay.day as DayKey)
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
    setRows((prev) =>
      prev.map((entry) =>
        selectedDays.includes(entry.weekDay.day as DayKey)
          ? { ...entry, weekDay: { ...entry.weekDay, isActive: false } }
          : entry,
      ),
    );
    toast.info("Los días seleccionados ahora están inactivos");
  };

  const handleSave = async () => {
    if (!isCustom) {
      try {
        await resetSchedule({ barbershopMemberId: member._id });
        haptic.trigger("success");
        toast.success("Horario restablecido al de la barbería");
        onSuccess?.();
      } catch (error) {
        haptic.trigger("error");
        toast.error(getConvexErrorMessage(error));
      }
      return;
    }

    try {
      const validatedRows = rows.map((entry) => validateEntry(entry));
      await updateSchedule({
        barbershopMemberId: member._id,
        availability: validatedRows,
      });
      haptic.trigger("success");
      toast.success("Horario del barbero actualizado");
      onSuccess?.();
    } catch (error) {
      haptic.trigger("error");
      toast.error(
        error instanceof Error ? error.message : getConvexErrorMessage(error),
      );
    }
  };

  const handleReset = async () => {
    try {
      await resetSchedule({ barbershopMemberId: member._id });
      haptic.trigger("success");
      toast.success("Horario restablecido al de la barbería");
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
  };

  return {
    applyScheduleToSelectedDays,
    disableSelectedDays,
    formError,
    handleReset,
    handleSave,
    handleSelectedDaysChange,
    hasChanges,
    hasLunch,
    isCustom,
    isLoading,
    isPending: isUpdating || isResetting,
    isResetting,
    rows,
    schedule,
    scheduleData,
    selectedDays,
    setHasLunch,
    setIsCustom,
    setSchedule,
  };
}

export const BarberScheduleEditor: FC<BarberScheduleEditorProps> = ({
  member,
  onCancel,
  onSuccess,
}) => {
  const formIds = useScheduleFieldIds();
  const {
    applyScheduleToSelectedDays,
    disableSelectedDays,
    formError,
    handleReset,
    handleSave,
    handleSelectedDaysChange,
    hasChanges,
    hasLunch,
    isCustom,
    isLoading,
    isPending,
    isResetting,
    rows,
    schedule,
    scheduleData,
    selectedDays,
    setHasLunch,
    setIsCustom,
    setSchedule,
  } = useBarberScheduleEditor({ member, onSuccess });

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Field orientation="horizontal">
            <Switch
              id={formIds.customToggle}
              checked={isCustom}
              onCheckedChange={(checked) => setIsCustom(Boolean(checked))}
              disabled={isPending}
            />
            <FieldContent>
              <FieldLabel htmlFor={formIds.customToggle}>
                Usar horario personalizado
              </FieldLabel>
              <FieldDescription>
                {isCustom
                  ? "Este barbero tiene su propio horario."
                  : "Este barbero usa el horario de la barbería."}
              </FieldDescription>
            </FieldContent>
          </Field>

          <Activity mode={isCustom ? "visible" : "hidden"}>
            <ScheduleSummary rows={rows} />
          </Activity>

          <Activity mode={isCustom ? "visible" : "hidden"}>
            <FieldGroup>
              <DaySelectionField
                selectedDays={selectedDays}
                onSelectedDaysChange={handleSelectedDaysChange}
                formError={formError}
              />

              <TimeRangeFields
                formIds={formIds}
                schedule={schedule}
                setSchedule={setSchedule}
              />

              <LunchBreakFields
                formIds={formIds}
                hasLunch={hasLunch}
                setHasLunch={setHasLunch}
                schedule={schedule}
                setSchedule={setSchedule}
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={applyScheduleToSelectedDays}
                  disabled={isPending}
                >
                  Aplicar horario
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={disableSelectedDays}
                  disabled={!selectedDays.length || isPending}
                >
                  Desactivar días
                </Button>
                {scheduleData?.isCustom && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={isPending}
                  >
                    {isResetting && <Spinner />}
                    Usar horario de la barbería
                  </Button>
                )}
              </div>
            </FieldGroup>
          </Activity>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {onCancel ? (
              <Button variant="outline" onClick={onCancel} disabled={isPending}>
                Cancelar
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={handleSave}
              disabled={isPending || !hasChanges}
            >
              {isPending && <Spinner />}
              Guardar cambios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

interface BarberScheduleDialogProps {
  member: BarbershopMemberWithName;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BarberScheduleDialog: FC<BarberScheduleDialogProps> = ({
  member,
  open,
  onOpenChange,
}) => {
  return (
    <>
      <Button variant="outline" onClick={() => onOpenChange(true)}>
        Horario
      </Button>

      <ResponsiveModal open={open} onOpenChange={onOpenChange}>
        <ResponsiveModalContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>
              Horario de {member.name}
            </ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Configura el horario personalizado de este barbero o usa el
              horario de la barbería.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>

          <ResponsiveModalFooter>
            <BarberScheduleEditor
              member={member}
              onCancel={() => onOpenChange(false)}
              onSuccess={() => onOpenChange(false)}
            />
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
};
