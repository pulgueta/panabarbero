import type { Appointment } from "@panabarbero/convex/schemas";
import type { FC, FormEvent, ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { useAppointmentActions } from "@/hooks/use-appointments";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { getConvexErrorMessage } from "@/lib/convex-errors";

interface MarkAppointmentDialogProps {
  trigger: ReactNode;
  appointmentId: Appointment["_id"];
}

export const MarkAppointmentDialog: FC<MarkAppointmentDialogProps> = ({
  trigger,
  appointmentId,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const { isMobile } = useIsMobile();

  const title = "Marcar cita";
  const description = "Asigna el estado final de la cita.";

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>

          <div className="p-4">
            <OptionsForm
              appointmentId={appointmentId}
              onClose={() => setOpen(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <OptionsForm
          appointmentId={appointmentId}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

interface OptionsFormProps {
  appointmentId: Appointment["_id"];
  onClose: () => void;
}

const OptionsForm: FC<OptionsFormProps> = ({ appointmentId, onClose }) => {
  const formIds = {
    completed: useId(),
    noShow: useId(),
  };
  const {
    setStatusMutation: {
      mutateAsync: setStatus,
      isPending: isSettingStatus,
      isSuccess: isSettingStatusSuccess,
    },
  } = useAppointmentActions();

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const formData = new FormData(e.target as HTMLFormElement);
    const status = formData.get("status") as "completed" | "no-show";

    try {
      await setStatus({
        appointmentId,
        status,
      });

      return;
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      return;
    }
  };

  useEffect(() => {
    if (isSettingStatusSuccess) {
      toast.success("Cita marcada correctamente.");
      onClose();
    }
  }, [isSettingStatusSuccess, onClose]);

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <RadioGroup defaultValue="completed" name="status">
        <div className="flex items-center gap-3">
          <RadioGroupItem value="completed" id={formIds.completed} />
          <Label htmlFor={formIds.completed}>Completada</Label>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroupItem value="no-show" id={formIds.noShow} />
          <Label htmlFor={formIds.noShow}>No asistió</Label>
        </div>
      </RadioGroup>

      <Button type="submit" disabled={isSettingStatus}>
        {isSettingStatus && <Spinner />}
        Marcar
      </Button>
    </form>
  );
};
