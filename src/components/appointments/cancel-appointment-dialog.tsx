import type { Appointment } from "@convex/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FC, ReactElement } from "react";
import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const CancelAppointmentDialog: FC<CancelAppointmentDialogProps> = ({
  appointment,
  trigger,
  userId,
  isBarber,
  open,
  onOpenChange,
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

  const haptic = useWebHaptics();

  const {
    cancelAppointmentMutation: {
      mutateAsync: cancelAppointment,
      isPending: isCancellingAppointment,
      isSuccess: isCancelAppointmentSuccess,
    },
  } = useAppointmentActions();

  useEffect(() => {
    if (isCancelAppointmentSuccess) {
      haptic.trigger("success");
      toast.success("Cita cancelada correctamente.");
    }
  }, [isCancelAppointmentSuccess, haptic]);

  const title = "Cancelar cita";
  const cancelButtonLabel = "Si, cancelar";
  const cancelDialogDescription = `Esta acción cancelará la cita y no podrá ser recuperada. Tendrás que volver a agendarla. Tu ${isBarber ? "cliente" : "barbero"} será notificado.`;

  const onSubmit = form.handleSubmit(async (values) => {
    if (!isBarber) {
      form.setValue("notes", "");
    }

    try {
      await cancelAppointment({
        appointmentId: { id: appointment._id },
        reason: values.notes,
        cancelledByUserId: userId,
        cancelledBy: isBarber ? "barber" : "customer",
      });
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
      return;
    }
  });

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalTrigger nativeButton={false} render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {cancelDialogDescription}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <CancelAppointmentForm
          isBarber={isBarber}
          form={form}
          formIds={formIds}
          onSubmit={onSubmit}
          disabled={isCancellingAppointment}
        />

        <ResponsiveModalFooter>
          <Button
            variant="destructive"
            disabled={isCancellingAppointment}
            form={formIds.form}
            type="submit"
          >
            {isCancellingAppointment && <Spinner />}
            {cancelButtonLabel}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
