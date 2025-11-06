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
import type { Barbershop } from "@panabarbero/convex/schemas";
import { CreateServiceForm } from "./create-service-form";

interface CreateServiceDialogProps {
  barbershopId: Barbershop["_id"];
}

export const CreateServiceDialog: FC<CreateServiceDialogProps> = ({ barbershopId }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Agregar servicio</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar servicio</DialogTitle>
          <DialogDescription>
            Define los datos básicos del servicio.
          </DialogDescription>
        </DialogHeader>

        <CreateServiceForm barbershopId={barbershopId} />
      </DialogContent>
    </Dialog>
  );
};


