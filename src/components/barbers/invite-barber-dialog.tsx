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
  canInviteStaff?: boolean;
}

export const InviteBarberDialog: FC<InviteBarberDialogProps> = ({
  trigger,
  canInviteStaff = false,
}) => {
  return (
    <ResponsiveModal>
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Invitar miembro al equipo</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Proporciona los datos del miembro a invitar.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalFooter>
          <InviteBarberForm canInviteStaff={canInviteStaff} />
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
