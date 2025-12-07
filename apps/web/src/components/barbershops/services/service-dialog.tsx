import type { Barbershop, Service } from "@panabarbero/convex/schemas";
import type { FC, ReactNode } from "react";

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
import type { ServiceFormData } from "@/lib/schemas";
import { ServiceForm } from "./service-form";

interface ServiceDialogProps {
  barbershopId: Barbershop["_id"];
  initialValues?: ServiceFormData;
  serviceId?: Service["_id"];
  trigger: ReactNode;
}

export const ServiceDialog: FC<ServiceDialogProps> = ({
  barbershopId,
  initialValues,
  serviceId,
  trigger,
}) => {
  const { isMobile } = useIsMobile();

  const headLabel = `${initialValues ? "Editar" : "Agregar"} servicio`;
  const description = `${initialValues ? "Actualiza los datos del servicio." : "Define los datos básicos del servicio."}`;

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{headLabel}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>

          <div className="p-4">
            <ServiceForm
              barbershopId={barbershopId}
              initialValues={initialValues}
              serviceId={serviceId}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{headLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ServiceForm
          barbershopId={barbershopId}
          initialValues={initialValues}
          serviceId={serviceId}
        />
      </DialogContent>
    </Dialog>
  );
};
