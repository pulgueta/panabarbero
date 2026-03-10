import type { FC, ReactElement } from "react";

import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import { InviteBarberForm } from "./invite-barber-form";

interface InviteBarberDialogProps {
  trigger: ReactElement;
}

export const InviteBarberDialog: FC<InviteBarberDialogProps> = ({
  trigger,
}) => {
  return (
    <ResponsiveModal>
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Invitar barbero</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Proporciona los datos del barbero a invitar.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalFooter>
          <InviteBarberForm />
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
