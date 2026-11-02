import type { Appointment } from "@convex/schema";
import type { FC, ReactElement } from "react";
import { useState } from "react";

import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
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
  const [internalOpen, setInternalOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const cancelDialogDescription = `Esta acción cancelará la cita y no podrá ser recuperada. Tendrás que volver a agendarla. Tu ${isBarber ? "cliente" : "barbero"} será notificado.`;

  return (
    <ResponsiveModal
      open={open ?? internalOpen}
      onOpenChange={handleOpenChange}
    >
      <ResponsiveModalTrigger nativeButton render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Cancelar cita</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {cancelDialogDescription}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalFooter>
          <CancelAppointmentForm
            appointmentId={appointment._id}
            userId={userId}
            isBarber={isBarber}
            onSuccess={() => handleOpenChange(false)}
          />
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
