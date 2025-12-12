import type { Barbershop, Service } from "@panabarbero/convex/schemas";
import type { FC, ReactNode } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useServiceActions } from "@/hooks/use-services";
import { getConvexErrorMessage } from "@/lib/convex-errors";

interface DeleteServiceDialogProps {
  trigger: ReactNode;
  serviceId: Service["_id"];
  barbershopId: Barbershop["_id"];
}

export const DeleteServiceDialog: FC<DeleteServiceDialogProps> = ({
  trigger,
  serviceId,
  barbershopId,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const { isMobile } = useIsMobile();
  const {
    deleteServiceMutation: {
      mutateAsync: deleteService,
      isPending: isDeleting,
      isSuccess: isDeleted,
    },
  } = useServiceActions();

  const deleteDialogTitle = "Eliminar servicio";
  const deleteDialogDescription =
    "¿Estás seguro que deseas eliminar este servicio? Esta acción no se puede deshacer.";
  const deleteButtonLabel = "Si, eliminar";

  const onDelete = async () => {
    try {
      await deleteService({
        serviceId,
        barbershopId,
      });
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      return;
    }
  };

  useEffect(() => {
    if (isDeleted) {
      toast.success("Servicio eliminado exitosamente");
      setOpen(false);
    }
  }, [isDeleted]);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{deleteDialogTitle}</DrawerTitle>
            <DrawerDescription>{deleteDialogDescription}</DrawerDescription>
          </DrawerHeader>

          <DrawerFooter>
            <Button variant="destructive" onClick={onDelete}>
              {isDeleting && <Spinner />}
              {deleteButtonLabel}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{deleteDialogTitle}</DialogTitle>
          <DialogDescription>{deleteDialogDescription}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="destructive" onClick={onDelete}>
            {isDeleting && <Spinner />}
            {deleteButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
