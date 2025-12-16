import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
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
}

export const InviteBarberDialog: FC<InviteBarberDialogProps> = ({
  barbershopId,
}) => {
  const headLabel = "Invitar barbero";
  const description = "Proporciona los datos del barbero a invitar.";
  const buttonLabel = "Invitar (pronto)";
  const buttonVariant = "outline";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button disabled variant={buttonVariant}>
          {buttonLabel}
        </Button>
      </DialogTrigger>
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
