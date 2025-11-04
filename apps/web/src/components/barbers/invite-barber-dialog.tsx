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
import { InviteBarberForm } from "./invite-barber-form";

export const InviteBarberDialog: FC = () => {
  const { isMobile } = useIsMobile();

  const headLabel = "Invitar barbero";
  const description = "Proporciona los datos del barbero a invitar.";
  const buttonLabel = "Invitar";
  const buttonVariant = "outline";

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
            <InviteBarberForm />
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

        <InviteBarberForm />
      </DialogContent>
    </Dialog>
  );
};
