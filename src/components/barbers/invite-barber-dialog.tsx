import type { Barbershop } from "@convex/tables";
import type { FC, ReactElement } from "react";

import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import { InviteBarberForm } from "./invite-barber-form";

interface InviteBarberDialogProps {
  barbershopId: Barbershop["_id"];
  trigger: ReactElement;
}

export const InviteBarberDialog: FC<InviteBarberDialogProps> = ({
  barbershopId,
  trigger,
}) => {
  const headLabel = "Invitar barbero";
  const description = "Proporciona los datos del barbero a invitar.";

  return (
    <ResponsiveModal>
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{headLabel}</ResponsiveModalTitle>
          <ResponsiveModalDescription>{description}</ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <InviteBarberForm barbershopId={barbershopId} />
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
