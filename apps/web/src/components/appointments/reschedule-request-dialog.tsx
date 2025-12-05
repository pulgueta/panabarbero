/** biome-ignore-all lint/style/noNonNullAssertion: needed */
import { zodResolver } from "@hookform/resolvers/zod";
import type { Appointment } from "@panabarbero/convex/schemas";
import type { FC, ReactNode } from "react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  useAppointmentActions,
  useAppointmentFormMetadata,
} from "@/hooks/use-appointments";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useSession } from "@/hooks/use-session";
import { rescheduleRequestFormSchema } from "@/lib/schemas";
import { RescheduleRequestForm } from "./reschedule-request-form";

interface RescheduleRequestDialogProps {
  appointment: Appointment;
  trigger: ReactNode;
  to?: "barber" | "customer";
}

export const RescheduleRequestDialog: FC<RescheduleRequestDialogProps> = ({
  appointment,
  trigger,
  to,
}) => {
  const formIds = {
    form: useId(),
    date: useId(),
    time: useId(),
    note: useId(),
  };

  const form = useForm({
    resolver: zodResolver(rescheduleRequestFormSchema),
    defaultValues: {
      date: undefined,
      note: "",
    },
  });

  const { data: session } = useSession();
  const { isMobile } = useIsMobile();
  const {
    disableDay,
    scheduleForDate,
    timeStringToMinutes,
    minutesOfTimestamp,
  } = useAppointmentFormMetadata(appointment.barbershopId);
  const {
    requestRescheduleMutation: {
      mutateAsync: rescheduleRequest,
      isPending: isSendingRescheduleRequest,
    },
  } = useAppointmentActions();

  const onSubmit = form.handleSubmit(async (values) => {
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

    await rescheduleRequest({
      appointmentId: appointment._id,
      proposedDate: timestamp,
      requestedByUserId: session?.userId!,
      note: values.note,
    });

    toast.success(
      `Solicitud enviada al ${to === "barber" ? "barbero" : "cliente"}.`,
    );
  });

  const disabled = isSendingRescheduleRequest || form.formState.isSubmitting;

  const toLabel = to === "barber" ? "barbero" : "cliente";
  const headLabel = "Solicitar reagendamiento";
  const description = `Puedes proponer una nueva fecha y hora para que el ${toLabel} la acepte o rechace.`;
  const sendButtonLabel = "Enviar solicitud";

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{headLabel}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>

          <div className="p-4">
            <RescheduleRequestForm
              // @ts-expect-error - zod's coerce method returns an unknown type
              form={form}
              formIds={formIds}
              onSubmit={onSubmit}
              disableDay={disableDay}
              to={to}
            />
          </div>

          <DrawerFooter>
            <Field>
              <Button type="submit" form={formIds.form} disabled={disabled}>
                {isSendingRescheduleRequest && <Spinner />}
                {sendButtonLabel}
              </Button>
            </Field>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{headLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <RescheduleRequestForm
          // @ts-expect-error - zod's coerce method returns an unknown type
          form={form}
          formIds={formIds}
          onSubmit={onSubmit}
          disableDay={disableDay}
          to={to}
        />

        <DialogFooter>
          <Button type="submit" form={formIds.form} disabled={disabled}>
            {isSendingRescheduleRequest && <Spinner />}
            {sendButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
