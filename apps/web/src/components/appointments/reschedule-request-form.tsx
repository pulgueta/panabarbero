import type { Appointment } from "@convex/tables";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Clock8Icon } from "lucide-react";
import type { BaseSyntheticEvent, FC } from "react";
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
import { cn } from "@/lib/utils";

interface RescheduleRequestFormProps {
  disableDay: (day: Date) => boolean;
  form: UseFormReturn<output<typeof rescheduleRequestFormSchema>>;
  formIds: {
    form: string;
    date: string;
    time: string;
  };
  onSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
  appointment: Appointment;
}

export const RescheduleRequestForm: FC<RescheduleRequestFormProps> = ({
  onSubmit,
  formIds,
  disableDay,
  form,
  appointment,
}) => {
  const originalDay = new Date(appointment.date).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const originalTime = new Date(appointment.date).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <form id={formIds.form} onSubmit={onSubmit} className="space-y-4">
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
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    {field.value ? (
                      format(new Date(field.value as number), "PPP")
                    ) : (
                      <span>Seleccione una fecha</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <Calendar
                    mode="single"
                    selected={
                      field.value ? new Date(field.value as number) : undefined
                    }
                    onSelect={(date) => {
                      if (!date) {
                        field.onChange(undefined);
                        return;
                      }
                      const current = field.value
                        ? new Date(field.value as number)
                        : (() => {
                            const d = new Date();
                            d.setHours(8, 30, 0, 0);
                            return d;
                          })();
                      const combined = new Date(date);
                      combined.setHours(
                        current.getHours(),
                        current.getMinutes(),
                        0,
                        0,
                      );
                      field.onChange(combined.getTime());
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
                  <Clock8Icon className="size-4" />
                  <span className="sr-only">Hora</span>
                </div>
                <Input
                  type="time"
                  id={formIds.time}
                  value={
                    field.value
                      ? format(new Date(field.value as number), "HH:mm")
                      : ""
                  }
                  onChange={(e) => {
                    const time = e.target.value;
                    const date = field.value
                      ? new Date(field.value as number)
                      : undefined;
                    if (time) {
                      const [hours, minutes] = time.split(":").map(Number);
                      const base = date ?? new Date();
                      const updatedDate = new Date(base);
                      updatedDate.setHours(hours, minutes, 0, 0);
                      field.onChange(updatedDate.getTime());
                    }
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
