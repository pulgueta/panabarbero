import type { Barbershop } from "@panabarbero/convex/schemas";
import { useNavigate } from "@tanstack/react-router";
import type { FC, ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateBarbershopForm } from "./create-barbershop-form";

interface CreateBarbershopDialogProps {
  trigger: ReactNode;
  userId: string | undefined;
}

export const CreateBarbershopDialog: FC<CreateBarbershopDialogProps> = ({
  trigger,
  userId,
}) => {
  const navigate = useNavigate();

  const onSuccess = (barbershopId: Barbershop["_id"]) => {
    navigate({
      to: "/profile/barbershops/settings",
      search: (prev) => ({ ...prev, barbershopId }),
    });
  };

  const title = "Crea tu barbería";
  const description =
    "Proporciona la información necesaria para registrar tu barbería. Podrás completar más detalles luego.";

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <CreateBarbershopForm onSuccess={onSuccess} userId={userId} />
      </DialogContent>
    </Dialog>
  );
};
