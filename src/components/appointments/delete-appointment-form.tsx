import type { Appointment } from "@convex/schema";
import { revalidateLogic } from "@tanstack/react-form";
import type { FC } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { FieldGroup } from "@/components/ui/field";
import { useAppointmentActions } from "@/hooks/use-appointments";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { cancelAppointmentFormSchema } from "@/lib/schemas";

interface CancelAppointmentFormProps {
  appointmentId: Appointment["_id"];
  userId: string;
  isBarber: boolean;
  onSuccess?: () => void;
}

export const CancelAppointmentForm: FC<CancelAppointmentFormProps> = ({
  appointmentId,
  userId,
  isBarber,
  onSuccess,
}) => {
  const haptic = useWebHaptics();

  const {
    cancelAppointmentMutation: { mutateAsync: cancelAppointment },
  } = useAppointmentActions();

  const form = useAppForm({
    onSubmitInvalid: () => {
      haptic.trigger("error");
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onSubmit: cancelAppointmentFormSchema,
    },
    defaultValues: {
      notes: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await cancelAppointment({
          appointmentId: { id: appointmentId },
          reason: value.notes,
          cancelledByUserId: userId,
          cancelledBy: isBarber ? "barber" : "customer",
        });

        haptic.trigger("success");
        toast.success("Cita cancelada correctamente.");
        form.reset();

        onSuccess?.();
      } catch (error) {
        haptic.trigger("error");
        toast.error(getConvexErrorMessage(error));
        return;
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="w-full space-y-4"
    >
      <FieldGroup>
        <form.AppField name="notes">
          {(field) => (
            <field.TextAreaField
              label={`Nota para el ${isBarber ? "cliente" : "barbero"}`}
              placeholder="Debe contener mínimo 8 caracteres."
              description="Ejemplo: Tuviste una emergencia y no podrás asistir."
              className="min-h-24 resize-none"
              maxLength={300}
            />
          )}
        </form.AppField>
      </FieldGroup>

      <form.AppForm>
        <form.SubmitButton
          label="Si, cancelar"
          variant="destructive"
          className="w-full"
        />
      </form.AppForm>
    </form>
  );
};
