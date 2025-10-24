import type { Service } from "@panabarbero/convex/schemas";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
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

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button variant="outline" size="sm">
            Reservar
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Reservar servicio: {service.name}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">
            <BookingForm service={service} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Button variant="outline" size="sm">
      Reservar
    </Button>
  );
};
