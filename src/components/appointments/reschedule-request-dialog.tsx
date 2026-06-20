import type { Appointment } from "@convex/schema";
import type { FC, ReactElement } from "react";
import { useState } from "react";

import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import { RescheduleRequestForm } from "./reschedule-request-form";

interface RescheduleRequestDialogProps {
  appointment: Appointment;
  trigger: ReactElement;
  to?: "barber" | "customer";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const RescheduleRequestDialog: FC<RescheduleRequestDialogProps> = ({
  appointment,
  trigger,
  to,
  open,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);

  const isOpen = open ?? internalOpen;
  const handleOpenChange = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };

  const toLabel = to === "barber" ? "barbero" : "cliente";
  const headLabel = "Solicitar reagendamiento";
  const description = `Puedes proponer una nueva fecha y hora a tu ${toLabel}.`;

  return (
    <ResponsiveModal open={isOpen} onOpenChange={handleOpenChange}>
      <ResponsiveModalTrigger nativeButton render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{headLabel}</ResponsiveModalTitle>
          <ResponsiveModalDescription>{description}</ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <RescheduleRequestForm
          appointment={appointment}
          to={to}
          onSuccess={() => handleOpenChange(false)}
        />
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
