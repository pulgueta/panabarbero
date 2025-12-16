import type { Appointment } from "@panabarbero/convex/schemas";
import type { FC, ReactNode } from "react";
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
  trigger: ReactNode;
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

  const deleteButtonLabel = "Si, eliminar";
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
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
