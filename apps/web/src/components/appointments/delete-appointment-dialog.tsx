import type { Appointment } from "@convex/schema";
import type { FC, ReactElement } from "react";
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

interface DeleteAppointmentDialogProps {
  appointment: Appointment;
  trigger: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const DeleteAppointmentDialog: FC<DeleteAppointmentDialogProps> = ({
  appointment,
  trigger,
  open,
  onOpenChange,
}) => {
  const haptic = useWebHaptics();

  const {
    deleteAppointmentMutation: {
      mutateAsync: deleteAppointment,
      isPending: isDeletingAppointment,
    },
  } = useAppointmentActions();

  const deleteButtonLabel = "Sí, eliminar";
  const deleteDialogDescription =
    "Esta acción eliminará la cita de los registros y no podrá ser recuperada.";

  const onDelete = async () => {
    try {
      await deleteAppointment({
        appointmentId: { id: appointment._id },
      });
      haptic.trigger("success");
      toast.success("Cita eliminada correctamente.");
    } catch (_error) {
      haptic.trigger("error");
      toast.error("No se pudo eliminar la cita. Intenta de nuevo.");
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalTrigger nativeButton render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Eliminar cita</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {deleteDialogDescription}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalFooter>
          <Button
            variant="destructive"
            disabled={isDeletingAppointment}
            onClick={onDelete}
          >
            {isDeletingAppointment && <Spinner />}
            {deleteButtonLabel}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
