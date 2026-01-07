import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC, ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InviteBarberForm } from "./invite-barber-form";

interface InviteBarberDialogProps {
  barbershopId: Barbershop["_id"];
  trigger: ReactNode;
}

export const InviteBarberDialog: FC<InviteBarberDialogProps> = ({
  barbershopId,
  trigger,
}) => {
  const headLabel = "Invitar barbero";
  const description = "Proporciona los datos del barbero a invitar.";

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{headLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <InviteBarberForm barbershopId={barbershopId} />
      </DialogContent>
    </Dialog>
  );
};
