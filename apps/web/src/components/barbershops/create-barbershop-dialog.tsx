import { useNavigate } from "@tanstack/react-router";
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
import { CreateBarbershopForm } from "./create-barbershop-form";

interface CreateBarbershopDialogProps {
  trigger: ReactElement;
  userId: string | undefined;
}

export const CreateBarbershopDialog: FC<CreateBarbershopDialogProps> = ({
  trigger,
  userId,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const navigate = useNavigate();

  const title = "Crea tu barbería";
  const description = "Ingresa los datos generales tu barbería.";

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
          <ResponsiveModalDescription>{description}</ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <CreateBarbershopForm
          userId={userId}
          onSuccess={() => {
            setOpen(false);
            navigate({
              to: "/profile/barbershops/settings",
            });
          }}
        />
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
