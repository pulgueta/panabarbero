import type { Service } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { useState } from "react";

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
import { useSession } from "@/hooks/use-session";
import { AppointmentForm } from "./appointment-form";

interface AppointmentButtonProps {
  service: Service;
}

export const AppointmentButton: FC<AppointmentButtonProps> = ({ service }) => {
  const [open, setOpen] = useState<boolean>(false);

  const { isMobile } = useIsMobile();
  const { data: user } = useSession();

  const headLabel = `Reservar: ${service.name}`;
  const description =
    "Proporciona los datos del cliente para reservar el servicio.";
  const buttonLabel = "Reservar";
  const buttonVariant = "default";

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant={buttonVariant}>{buttonLabel}</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{headLabel}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            <AppointmentForm
              service={service}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant}>{buttonLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{headLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <AppointmentForm
          service={service}
          initialValues={{
            customerName: user?.name,
            contactEmail: user?.email,
          }}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
