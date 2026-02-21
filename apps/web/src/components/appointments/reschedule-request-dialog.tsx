/** biome-ignore-all lint/style/noNonNullAssertion: needed */

import type { Appointment } from "@convex/tables";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FC, ReactElement } from "react";
import { useEffect, useId } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import {
  useAppointmentActions,
  useAppointmentFormMetadata,
} from "@/hooks/use-appointments";
import { useSession } from "@/hooks/use-session";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { rescheduleRequestFormSchema } from "@/lib/schemas";
import { RescheduleRequestForm } from "./reschedule-request-form";

interface RescheduleRequestDialogProps {
  appointment: Appointment;
  trigger: ReactElement;
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
  };

  const form = useForm({
    resolver: zodResolver(rescheduleRequestFormSchema),
    defaultValues: {
      date: undefined,
    },
  });

  const { data: session } = useSession();

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
      isSuccess: isSentRescheduleRequest,
    },
  } = useAppointmentActions();

  useEffect(() => {
    if (isSentRescheduleRequest) {
      toast.success(
        `Solicitud enviada al ${to === "barber" ? "barbero" : "cliente"}.`,
      );
    }
  }, [isSentRescheduleRequest, to]);

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

    try {
      await rescheduleRequest({
        appointmentId: appointment._id,
        proposedDate: timestamp,
        requestedByUserId: session?.userId!,
      });
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      return;
    }
  });

  const toLabel = to === "barber" ? "barbero" : "cliente";
  const headLabel = "Solicitar reagendamiento";
  const description = `Puedes proponer una nueva fecha y hora a tu ${toLabel}.`;
  const sendButtonLabel = "Enviar solicitud";

  return (
    <Dialog>
      <DialogTrigger nativeButton={false} render={trigger} />
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
          appointment={appointment}
        />

        <DialogFooter>
          <Button
            type="submit"
            form={formIds.form}
            disabled={isSendingRescheduleRequest}
          >
            {isSendingRescheduleRequest && <Spinner />}
            {sendButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
