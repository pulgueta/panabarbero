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
import { useAppointmentActions } from "@/hooks/use-appointments";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { cancelAppointmentFormSchema } from "@/lib/schemas";
import { CancelAppointmentForm } from "./delete-appointment-form";

interface CancelAppointmentDialogProps {
  appointment: Appointment;
  trigger: ReactElement;
  userId: string;
  isBarber: boolean;
}

export const CancelAppointmentDialog: FC<CancelAppointmentDialogProps> = ({
  appointment,
  trigger,
  userId,
  isBarber,
}) => {
  const formIds = {
    notes: useId(),
    form: useId(),
  };

  const form = useForm({
    resolver: zodResolver(cancelAppointmentFormSchema),
    defaultValues: {
      notes: "",
    },
  });

  const {
    cancelAppointmentMutation: {
      mutateAsync: cancelAppointment,
      isPending: isCancellingAppointment,
      isSuccess: isCancelAppointmentSuccess,
    },
  } = useAppointmentActions();

  useEffect(() => {
    if (isCancelAppointmentSuccess) {
      toast.success("Cita cancelada correctamente.");
    }
  }, [isCancelAppointmentSuccess]);

  const title = "Cancelar cita";
  const cancelButtonLabel = "Si, cancelar";
  const cancelDialogDescription = `Esta acción cancelará la cita y no podrá ser recuperada. Tendrás que volver a agendarla. Tu ${isBarber ? "cliente" : "barbero"} será notificado.`;

  const onSubmit = form.handleSubmit(async (values) => {
    if (!isBarber) {
      form.setValue("notes", "");
    }

    try {
      await cancelAppointment({
        appointmentId: appointment._id,
        reason: values.notes,
        cancelledByUserId: userId,
        cancelledBy: isBarber ? "barber" : "customer",
      });
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      return;
    }
  });

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{cancelDialogDescription}</DialogDescription>
        </DialogHeader>

        <CancelAppointmentForm
          isBarber={isBarber}
          form={form}
          formIds={formIds}
          onSubmit={onSubmit}
          disabled={isCancellingAppointment}
        />

        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isCancellingAppointment}
            form={formIds.form}
            type="submit"
          >
            {isCancellingAppointment && <Spinner />}
            {cancelButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
