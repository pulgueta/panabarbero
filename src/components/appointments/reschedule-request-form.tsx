import type { Appointment } from "@convex/schema";
import { CalendarIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { revalidateLogic } from "@tanstack/react-form";
import { es } from "date-fns/locale";
import type { FC } from "react";
import { useId } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
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
import { ResponsiveModalFooter } from "@/components/ui/responsive-modal";
import {
  useAppointmentActions,
  useAppointmentFormMetadata,
} from "@/hooks/use-appointments";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { validateAppointmentTime } from "@/lib/schedule-utils";
import { rescheduleRequestFormSchema } from "@/lib/schemas";
import { cn, formatLongDate, formatTimeOfDay, toDate } from "@/lib/utils";

interface RescheduleRequestFormProps {
  appointment: Appointment;
  to?: "barber" | "customer";
  onSuccess?: () => void;
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
  appointment,
  to,
  onSuccess,
}) => {
  const timeId = useId();

  const haptic = useWebHaptics();

  const { disableDay, scheduleForDate } = useAppointmentFormMetadata(
    appointment.barbershopId,
  );

  const {
    requestRescheduleMutation: { mutateAsync: rescheduleRequest },
  } = useAppointmentActions();

  const form = useAppForm({
    onSubmitInvalid: () => {
      haptic.trigger("error");
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      // @ts-expect-error - zod's coerce method returns an unknown input type
      onSubmit: rescheduleRequestFormSchema,
    },
    defaultValues: {
      date: undefined as number | undefined,
    },
    onSubmit: async ({ value }) => {
      const timestamp = Number(value.date);

      const schedule = scheduleForDate(timestamp);
      const validation = validateAppointmentTime(schedule, timestamp);

      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      try {
        await rescheduleRequest({
          appointmentId: { id: appointment._id },
          proposedDate: timestamp,
        });

        haptic.trigger("success");
        toast.success(
          `Solicitud enviada al ${to === "barber" ? "barbero" : "cliente"}.`,
        );
        form.reset();
        onSuccess?.();
      } catch (error) {
        haptic.trigger("error");
        toast.error(getConvexErrorMessage(error));
        return;
      }
    },
  });

  const originalDay = formatLongDate(appointment.date);
  const originalTime = formatTimeOfDay(appointment.date);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
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
        <form.AppField name="date">
          {(field) => {
            const errors = field.state.meta.errors as unknown as Array<{
              message?: string;
            }>;
            const isInvalid = errors.length > 0;

            return (
              <>
                <Field data-invalid={isInvalid}>
                  <FieldLabel>Fecha propuesta</FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      nativeButton={false}
                      render={
                        <Button
                          variant="outline"
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.state.value && "text-muted-foreground",
                          )}
                          suppressHydrationWarning
                        >
                          {field.state.value ? (
                            formatLongDate(field.state.value)
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
                        selected={toDate(field.state.value)}
                        onSelect={(day) => {
                          if (!day) {
                            field.handleChange(undefined);
                            return;
                          }
                          field.handleChange(
                            combineDayAndCurrentTimeMs(day, field.state.value),
                          );
                        }}
                        disabled={disableDay}
                        className="bg-transparent [--cell-size:--spacing(12)]"
                        captionLayout="label"
                        locale={es}
                      />
                    </PopoverContent>
                  </Popover>
                  {isInvalid && <FieldError errors={errors} />}
                </Field>

                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={timeId}>Hora propuesta</FieldLabel>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-muted-foreground peer-disabled:opacity-50">
                      <ClockCounterClockwiseIcon className="size-4" />
                      <span className="sr-only">Hora</span>
                    </div>
                    <Input
                      type="time"
                      id={timeId}
                      suppressHydrationWarning
                      value={timeInputValue(field.state.value)}
                      disabled={field.state.value === undefined}
                      onChange={(e) => {
                        const time = e.target.value;
                        // Ignore time edits until a day is chosen, otherwise
                        // combineDateAndTimeMs would silently assign today.
                        if (!time || field.state.value === undefined) return;
                        field.handleChange(
                          combineDateAndTimeMs(field.state.value, time),
                        );
                      }}
                      className="peer appearance-none bg-background pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    />
                  </div>
                </Field>
              </>
            );
          }}
        </form.AppField>
      </FieldGroup>

      <ResponsiveModalFooter>
        <form.AppForm>
          <form.SubmitButton label="Enviar solicitud" />
        </form.AppForm>
      </ResponsiveModalFooter>
    </form>
  );
};
