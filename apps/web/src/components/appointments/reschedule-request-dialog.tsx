import { zodResolver } from "@hookform/resolvers/zod";
import type { Appointment } from "@panabarbero/convex/schemas";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar1Icon, CalendarIcon, Clock8Icon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  useAppointmentActions,
  useAppointmentFormMetadata,
} from "@/hooks/use-appointments";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useSession } from "@/hooks/use-session";
import { rescheduleRequestFormSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface RescheduleRequestDialogProps {
  appointment: Appointment;
  disabled?: boolean;
  trigger?: ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  to?: "barber" | "customer";
}

export const RescheduleRequestDialog: FC<RescheduleRequestDialogProps> = ({
  appointment,
  disabled = false,
  trigger,
  to = "barber",
  open,
  onOpenChange,
}) => {
  const formIds = {
    date: useId(),
    time: useId(),
  };
  const [internalOpen, setInternalOpen] = useState<boolean>(false);

  const { isMobile } = useIsMobile();
  const { data: session } = useSession();

  const {
    disableDay,
    scheduleForDate,
    timeStringToMinutes,
    minutesOfTimestamp,
  } = useAppointmentFormMetadata(appointment.barbershopId);

  const {
    requestReschedule: {
      mutateAsync: requestReschedule,
      isPending: isReschedulePending,
    },
  } = useAppointmentActions();

  const isCancelled = appointment.status === "cancelled";
  const isDisabled = disabled || isCancelled;

  const form = useForm({
    resolver: zodResolver(rescheduleRequestFormSchema),
    defaultValues: {
      date: undefined,
      note: "",
    },
  });

  const isControlled = open;
  const dialogOpen = isControlled ? open : internalOpen;
  const toLabel = to === "barber" ? "barbero" : "cliente";

  const setDialogOpen = (value: boolean) => {
    if (!isControlled) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    form.reset({
      date: undefined,
      note: "",
    });
  };

  const handleOpenChange = (value: boolean) => {
    if (isDisabled && value) return;
    setDialogOpen(value);
    if (!value) {
      form.reset();
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (!session?.userId) {
      toast.error("Debes iniciar sesión para enviar un reagendamiento.");
      return;
    }

    const timestamp = values.date;

    const schedule = scheduleForDate(timestamp);

    if (!schedule || !schedule.weekDay.isActive) {
      toast.error("La barbería no atiende en el día seleccionado.");
      return;
    }

    const selectedMinutes = minutesOfTimestamp(timestamp);
    const openMinutes = timeStringToMinutes(schedule.openAt);
    const closeMinutes = timeStringToMinutes(schedule.closeAt);

    if (
      (openMinutes !== null && selectedMinutes < openMinutes) ||
      (closeMinutes !== null && selectedMinutes >= closeMinutes)
    ) {
      toast.error("Selecciona una hora dentro del horario de atención.");
      return;
    }

    const lunchStartMinutes = timeStringToMinutes(schedule.lunchStart);
    const lunchEndMinutes = timeStringToMinutes(schedule.lunchEnd);

    if (
      lunchStartMinutes !== null &&
      lunchEndMinutes !== null &&
      selectedMinutes >= lunchStartMinutes &&
      selectedMinutes < lunchEndMinutes
    ) {
      toast.error(
        "No se puede proponer una cita durante el horario seleccionado.",
      );
      return;
    }

    await requestReschedule({
      appointmentId: appointment._id,
      proposedDate: timestamp,
      requestedByUserId: session.userId,
      note: values.note?.trim() ? values.note.trim() : undefined,
    });

    toast.success(`Solicitud enviada al ${toLabel}.`);
    closeDialog();
  });

  const headLabel = "Solicitar reagendamiento";
  const description = `Propón una nueva fecha y hora para que el ${toLabel} la acepte o rechace. Solo puedes solicitar un reagendamiento una vez cada 30 minutos.`;

  const triggerNode = useMemo(() => {
    if (trigger === null) return null;
    if (trigger === undefined) {
      return (
        <Button variant="secondary" disabled={isDisabled}>
          <Calendar1Icon className="mr-2 size-4" />
          {headLabel}
        </Button>
      );
    }

    return trigger;
  }, [isDisabled, trigger]);

  const formContent = (
    <form onSubmit={onSubmit} className="space-y-4">
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

      <Controller
        name="note"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Nota para el {toLabel} (opcional)</FieldLabel>
            <Textarea
              {...field}
              disabled={isReschedulePending}
              aria-invalid={fieldState.invalid}
              placeholder={`Comparte detalles adicionales con el ${toLabel}.`}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={closeDialog}
          disabled={isReschedulePending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isReschedulePending}>
          {isReschedulePending && <Spinner />}
          Enviar solicitud
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={dialogOpen} onOpenChange={handleOpenChange}>
        {triggerNode ? (
          <DrawerTrigger asChild>{triggerNode}</DrawerTrigger>
        ) : null}
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{headLabel}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>

          <div className="p-4">{formContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {triggerNode ? (
        <DialogTrigger asChild>{triggerNode}</DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{headLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {formContent}
      </DialogContent>
    </Dialog>
  );
};
