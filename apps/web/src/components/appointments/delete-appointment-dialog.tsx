import type { Appointment } from "@panabarbero/convex/schemas";
import { TrashIcon } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface DeleteAppointmentDialogProps {
  appointmentId: Appointment["_id"];
  isAlreadyCancelledOrDenied: boolean;
  isDeletingAppointment: boolean;
  isCancellingAppointment: boolean;
  deleteDialogChildren: React.ReactNode;
  handleDelete: (obj: {
    appointmentId: Appointment["_id"];
    isAlreadyCancelledOrDenied: boolean;
  }) => void;
  resetDeleteState: () => void;
}

export const DeleteAppointmentDialog: FC<DeleteAppointmentDialogProps> = ({
  appointmentId,
  isAlreadyCancelledOrDenied,
  isDeletingAppointment,
  isCancellingAppointment,
  deleteDialogChildren,
  handleDelete,
  resetDeleteState,
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);

  const { isMobile } = useIsMobile();

  const deleteDialogDescription =
    "Esta acción cancelará la cita, enviará un correo al cliente con el motivo indicado y luego la eliminará definitivamente.";

  if (isMobile) {
    return (
      <Drawer
        open={isDeleteDialogOpen}
        onOpenChange={(value) => {
          setIsDeleteDialogOpen(value);
          if (!value) {
            resetDeleteState();
          }
        }}
      >
        <DrawerTrigger asChild>
          <DropdownMenuItem
            className="inline-flex w-full items-center gap-x-2"
            onSelect={(event) => event.preventDefault()}
            disabled={isDeletingAppointment || isCancellingAppointment}
          >
            <TrashIcon className="size-3 text-destructive dark:text-destructive-foreground" />
            Cancelar y eliminar
          </DropdownMenuItem>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Eliminar cita</DrawerTitle>
            <DrawerDescription>{deleteDialogDescription}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 text-left text-muted-foreground text-sm">
            {deleteDialogChildren}
          </div>
          <DrawerFooter>
            <Button
              variant="destructive"
              onClick={() => {
                handleDelete({
                  appointmentId,
                  isAlreadyCancelledOrDenied,
                });
                setIsDeleteDialogOpen(false);
              }}
              disabled={isDeletingAppointment || isCancellingAppointment}
            >
              {isDeletingAppointment || isCancellingAppointment ? (
                <Spinner />
              ) : (
                "Cancelar y eliminar"
              )}
            </Button>
            <DrawerClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetDeleteState();
                  setIsDeleteDialogOpen(false);
                }}
              >
                No, cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog
      open={isDeleteDialogOpen}
      onOpenChange={(value) => {
        setIsDeleteDialogOpen(value);
        if (!value) {
          resetDeleteState();
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          className="inline-flex w-full items-center gap-x-2"
          onSelect={(event) => event.preventDefault()}
          disabled={isDeletingAppointment || isCancellingAppointment}
        >
          <TrashIcon className="size-3 text-destructive dark:text-destructive-foreground" />
          Cancelar y eliminar
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar cita</AlertDialogTitle>
          <AlertDialogDescription>
            {deleteDialogDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteDialogChildren}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetDeleteState();
                setIsDeleteDialogOpen(false);
              }}
            >
              No, cancelar
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={() => {
                handleDelete({
                  appointmentId,
                  isAlreadyCancelledOrDenied,
                });
                setIsDeleteDialogOpen(false);
              }}
              disabled={isDeletingAppointment || isCancellingAppointment}
            >
              {isDeletingAppointment || isCancellingAppointment ? (
                <Spinner />
              ) : (
                "Cancelar y eliminar"
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
