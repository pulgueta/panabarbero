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
import { Spinner } from "@/components/ui/spinner";
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
  const deleteButtonLabel = "Sí, eliminar";

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
