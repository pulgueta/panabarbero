import type { Service } from "@panabarbero/convex/schemas";
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
import { useIsBarbershopOwner } from "@/hooks/barbershop/use-barbershop";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useSession } from "@/hooks/use-session";
import { ServiceForm } from "../barbershops/services/service-form";
import { AppointmentForm } from "./appointment-form";

interface AppointmentButtonProps {
  service: Service;
}

export const AppointmentButton: FC<AppointmentButtonProps> = ({ service }) => {
  const { isMobile } = useIsMobile();
  const { data: user } = useSession();

  const { data: barbershop } = useIsBarbershopOwner(
    service.barbershopId,
    user?.userId ?? "",
  );

  const headLabel = barbershop
    ? `Editar: ${service.name}`
    : `Reservar: ${service.name}`;
  const description = barbershop
    ? "Ingresa los nuevos datos del servicio."
    : "Proporciona tus datos para reservar el servicio.";
  const buttonLabel = barbershop ? "Editar" : "Reservar";
  const buttonVariant = barbershop ? "outline" : "default";

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant={buttonVariant}>{buttonLabel}</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{headLabel}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            {barbershop ? (
              <ServiceForm
                barbershopId={barbershop._id}
                initialValues={service}
                serviceId={service._id}
              />
            ) : (
              <AppointmentForm service={service} />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={buttonVariant}>{buttonLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{headLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {barbershop ? (
          <ServiceForm
            barbershopId={barbershop._id}
            initialValues={service}
            serviceId={service._id}
          />
        ) : (
          <AppointmentForm service={service} />
        )}
      </DialogContent>
    </Dialog>
  );
};
