import type { Barbershop } from "@convex/schema";
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
  barbershopId: Barbershop["_id"];
  canInviteStaff?: boolean;
}

export const InviteBarberDialog: FC<InviteBarberDialogProps> = ({
  trigger,
  barbershopId,
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
          <InviteBarberForm
            barbershopId={barbershopId}
            canInviteStaff={canInviteStaff}
          />
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
