import { zodResolver } from "@hookform/resolvers/zod";
import type { Appointment } from "@panabarbero/convex/schemas";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAppointmentActions } from "@/hooks/use-appointments";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useSession } from "@/hooks/use-session";
import {
  rescheduleRequestFormSchema,
  type RescheduleRequestFormData,
} from "@/lib/schemas";
import { Calendar1Icon } from "lucide-react";

interface RescheduleRequestDialogProps {
  appointment: Appointment;
  disabled?: boolean;
  trigger?: ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function buildTimestamp(date: string, time: string): number {
  if (!date || !time) return Number.NaN;
  const composed = new Date(`${date}T${time}:00`);
  return composed.getTime();
}

export function RescheduleRequestDialog({
  appointment,
  disabled = false,
  trigger,
  open,
  onOpenChange,
}: RescheduleRequestDialogProps) {
  const { isMobile } = useIsMobile();
  const { data: session } = useSession();
  const {
    requestReschedule: { mutateAsync: requestReschedule, isPending },
  } = useAppointmentActions();
  const [internalOpen, setInternalOpen] = useState(false);

  const form = useForm<RescheduleRequestFormData>({
    resolver: zodResolver(rescheduleRequestFormSchema),
    defaultValues: {
      date: "",
      time: "",
      note: "",
    },
  });

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;

  const setDialogOpen = (value: boolean) => {
    if (!isControlled) {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    form.reset({
      date: "",
      time: "",
      note: "",
    });
  };

  const handleOpenChange = (value: boolean) => {
    if (disabled && value) return;
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

    const timestamp = buildTimestamp(values.date, values.time);

    if (Number.isNaN(timestamp)) {
      form.setError("time", {
        type: "manual",
        message: "Fecha u hora inválida",
      });
      return;
    }

    try {
      await requestReschedule({
        appointmentId: appointment._id,
        proposedDate: timestamp,
        requestedByUserId: session.userId,
        note: values.note?.trim() ? values.note.trim() : undefined,
      });

      toast.success("Solicitud enviada al cliente.");
      closeDialog();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo solicitar el reagendamiento.",
      );
    }
  });

  const headLabel = "Solicitar reagendamiento";
  const description =
    "Propón una nueva fecha y hora para que el cliente la acepte o rechace.";

  const triggerNode = useMemo(() => {
    if (trigger === null) return null;
    if (trigger === undefined) {
      return (
        <Button variant="secondary" disabled={disabled}>
          <Calendar1Icon className="mr-2 size-4" />
          {headLabel}
        </Button>
      );
    }

    return trigger;
  }, [disabled, trigger]);

  const formContent = (
    <form onSubmit={onSubmit} className="space-y-4">
      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          name="date"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Fecha propuesta</FieldLabel>
              <Input
                type="date"
                {...field}
                disabled={isPending}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="time"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Hora propuesta</FieldLabel>
              <Input
                type="time"
                step={300}
                {...field}
                disabled={isPending}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <Controller
        name="note"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>Nota para el cliente (opcional)</FieldLabel>
            <Textarea
              {...field}
              disabled={isPending}
              aria-invalid={fieldState.invalid}
              placeholder="Comparte detalles adicionales con tu cliente."
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
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />}
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
}
