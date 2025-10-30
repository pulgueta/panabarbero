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
import { useIsMobile } from "@/hooks/use-is-mobile";
import { BookingForm } from "./booking-form";

// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from "@/components/ui/popover";

interface BookingButtonProps {
  service: Service;
}

export const BookingButton: FC<BookingButtonProps> = ({ service }) => {
  const { isMobile } = useIsMobile();

  const headLabel = `Reservar servicio: ${service.name}`;
  const description = "Proporciona tus datos para reservar el servicio.";

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button size="sm">Reservar</Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{headLabel}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="p-4">
            <BookingForm service={service} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">Reservar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{headLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <BookingForm service={service} />
      </DialogContent>
    </Dialog>
  );
};
