import type { Barbershop } from "@convex/schema";
import type { FC, ReactElement } from "react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
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
  const formId = useId();
  const [isInvitingBarber, setIsInvitingBarber] = useState(false);

  return (
    <ResponsiveModal>
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{headLabel}</ResponsiveModalTitle>
          <ResponsiveModalDescription>{description}</ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <InviteBarberForm
          barbershopId={barbershopId}
          formId={formId}
          onLoadingChange={setIsInvitingBarber}
        />

        <ResponsiveModalFooter>
          <Field className="w-full">
            <Button
              type="submit"
              form={formId}
              disabled={isInvitingBarber}
              className="w-full"
            >
              {isInvitingBarber && <Spinner />} Invitar
            </Button>
          </Field>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
