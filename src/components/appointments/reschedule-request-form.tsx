import type { Appointment } from "@convex/schema";
import { CalendarIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { es } from "date-fns/locale";
import type { FC } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { output } from "zod";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { rescheduleRequestFormSchema } from "@/lib/schemas";
import { cn, formatLongDate, formatTimeOfDay, toDate } from "@/lib/utils";

interface RescheduleRequestFormProps {
  disableDay: (day: Date) => boolean;
  form: UseFormReturn<output<typeof rescheduleRequestFormSchema>>;
  formIds: {
    form: string;
    date: string;
    time: string;
  };
  appointment: Appointment;
}

function timeInputValue(value: number | undefined): string {
  if (value === undefined) return "";
  const date = new Date(value);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function combineDateAndTimeMs(
  baseMs: number | undefined,
  time: string,
): number {
  const [hours, minutes] = time.split(":").map(Number);
  const base = baseMs !== undefined ? new Date(baseMs) : new Date();
  base.setHours(hours, minutes, 0, 0);
  return base.getTime();
}

function combineDayAndCurrentTimeMs(
  day: Date,
  currentMs: number | undefined,
): number {
  const current =
    currentMs !== undefined
      ? new Date(currentMs)
      : (() => {
          const d = new Date();
          d.setHours(8, 30, 0, 0);
          return d;
        })();
  const combined = new Date(day);
  combined.setHours(current.getHours(), current.getMinutes(), 0, 0);
  return combined.getTime();
}

export const RescheduleRequestForm: FC<RescheduleRequestFormProps> = ({
  formIds,
  disableDay,
  form,
  appointment,
}) => {
  const originalDay = formatLongDate(appointment.date);
  const originalTime = formatTimeOfDay(appointment.date);

  return (
    <form
      id={formIds.form}
      onSubmit={(e) => e.preventDefault()}
      className="space-y-4"
      suppressHydrationWarning
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Fecha original</Label>

          <Input type="text" value={originalDay} disabled />
        </div>

        <div className="space-y-2">
          <Label>Hora original</Label>

          <Input type="text" value={originalTime} disabled />
        </div>
      </div>
      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          name="date"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Fecha propuesta</FieldLabel>
              <Popover>
                <PopoverTrigger
                  nativeButton={false}
                  render={
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                      suppressHydrationWarning
                    >
                      {field.value ? (
                        formatLongDate(field.value as number)
                      ) : (
                        <span>Seleccione una fecha</span>
                      )}
                      <CalendarIcon className="ml-auto size-4 opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent
                  className="w-auto p-0"
                  align="center"
                  suppressHydrationWarning
                >
                  <Calendar
                    mode="single"
                    selected={toDate(field.value as number | undefined)}
                    onSelect={(day) => {
                      if (!day) {
                        field.onChange(undefined);
                        return;
                      }
                      field.onChange(
                        combineDayAndCurrentTimeMs(
                          day,
                          field.value as number | undefined,
                        ),
                      );
                    }}
                    disabled={disableDay}
                    className="bg-transparent [--cell-size:--spacing(12)]"
                    captionLayout="label"
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="date"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={formIds.time}>Hora propuesta</FieldLabel>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-muted-foreground peer-disabled:opacity-50">
                  <ClockCounterClockwiseIcon className="size-4" />
                  <span className="sr-only">Hora</span>
                </div>
                <Input
                  type="time"
                  id={formIds.time}
                  suppressHydrationWarning
                  value={timeInputValue(field.value as number | undefined)}
                  onChange={(e) => {
                    const time = e.target.value;
                    if (!time) return;
                    field.onChange(
                      combineDateAndTimeMs(
                        field.value as number | undefined,
                        time,
                      ),
                    );
                  }}
                  className="peer appearance-none bg-background pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
              </div>
            </Field>
          )}
        />
      </FieldGroup>
    </form>
  );
};
