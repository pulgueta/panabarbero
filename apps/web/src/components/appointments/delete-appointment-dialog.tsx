import type { Appointment } from "@convex/tables";
import type { FC, ReactElement } from "react";
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

interface DeleteAppointmentDialogProps {
  appointment: Appointment;
  trigger: ReactElement;
}

export const DeleteAppointmentDialog: FC<DeleteAppointmentDialogProps> = ({
  appointment,
  trigger,
}) => {
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
    await deleteAppointment({
      appointmentId: appointment._id,
    });
    toast.success("Cita eliminada correctamente.");
  };

  return (
    <Dialog>
      <DialogTrigger nativeButton={false} render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar cita</DialogTitle>
          <DialogDescription>{deleteDialogDescription}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isDeletingAppointment}
            onClick={onDelete}
          >
            {isDeletingAppointment && <Spinner />}
            {deleteButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
