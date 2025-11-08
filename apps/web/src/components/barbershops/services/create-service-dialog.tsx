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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { CreateServiceForm } from "./create-service-form";

interface CreateServiceDialogProps {
  barbershopId: Barbershop["_id"];
}

export const CreateServiceDialog: FC<CreateServiceDialogProps> = ({
  barbershopId,
}) => {
  const { isMobile } = useIsMobile();

  const headLabel = "Agregar servicio";
  const description = "Define los datos básicos del servicio.";

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline">{headLabel}</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{headLabel}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>

          <div className="p-4">
            <CreateServiceForm barbershopId={barbershopId} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">{headLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{headLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <CreateServiceForm barbershopId={barbershopId} />
      </DialogContent>
    </Dialog>
  );
};
