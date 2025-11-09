import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC, PropsWithChildren } from "react";

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
import type { ServiceFormData } from "@/lib/schemas";
import { ServiceForm } from "./service-form";

interface ServiceDialogProps extends PropsWithChildren {
  barbershopId: Barbershop["_id"];
  initialValues?: ServiceFormData;
  asChild?: boolean;
}

export const ServiceDialog: FC<ServiceDialogProps> = ({
  barbershopId,
  initialValues,
  asChild = false,
  children,
}) => {
  const { isMobile } = useIsMobile();

  const headLabel = `${initialValues ? "Editar" : "Agregar"} servicio`;
  const description = `${initialValues ? "Actualiza los datos del servicio." : "Define los datos básicos del servicio."}`;

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild={asChild}>
          {asChild ? children : <Button variant="outline">{headLabel}</Button>}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{headLabel}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>

          <div className="p-4">
            <ServiceForm
              barbershopId={barbershopId}
              initialValues={initialValues}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild={asChild}>
        {asChild ? children : <Button variant="outline">{headLabel}</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{headLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ServiceForm
          barbershopId={barbershopId}
          initialValues={initialValues}
        />
      </DialogContent>
    </Dialog>
  );
};
