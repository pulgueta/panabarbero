import type { Appointment } from "@convex/tables";
import type { FC, FormEvent, ReactElement } from "react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import { Spinner } from "@/components/ui/spinner";
import { useAppointmentActions } from "@/hooks/use-appointments";
import { getConvexErrorMessage } from "@/lib/convex-errors";

interface MarkAppointmentDialogProps {
  trigger: ReactElement;
  appointmentId: Appointment["_id"];
}

export const MarkAppointmentDialog: FC<MarkAppointmentDialogProps> = ({
  trigger,
  appointmentId,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const title = "Marcar cita";
  const description = "Asigna el estado final de la cita.";

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
          <ResponsiveModalDescription>{description}</ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <OptionsForm
          appointmentId={appointmentId}
          onClose={() => setOpen(false)}
        />
      </ResponsiveModalContent>
    </ResponsiveModal>
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
  const haptic = useWebHaptics();
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
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
      return;
    }
  };

  useEffect(() => {
    if (isSettingStatusSuccess) {
      haptic.trigger("success");
      toast.success("Cita marcada correctamente.");
      onClose();
    }
  }, [isSettingStatusSuccess, onClose, haptic]);

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
