import { inviteBarberSchema } from "@convex/invitations";
import type { Barbershop } from "@convex/schema";
import { revalidateLogic } from "@tanstack/react-form";
import type { FC } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { FieldGroup } from "@/components/ui/field";
import { useBarbershopMemberActions } from "@/hooks/use-barbershop-members";
import { getConvexErrorMessage } from "@/lib/convex-errors";

interface InviteBarberFormProps {
  barbershopId: Barbershop["_id"];
}

export const InviteBarberForm: FC<InviteBarberFormProps> = ({
  barbershopId,
}) => {
  const haptic = useWebHaptics();

  const {
    inviteBarberMutation: { mutateAsync: inviteBarber },
  } = useBarbershopMemberActions();

  const form = useAppForm({
    onSubmitInvalid: () => {
      haptic.trigger("error");
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      // @ts-expect-error - convex id schema is not supported by tanstack form
      onSubmit: inviteBarberSchema,
    },
    defaultValues: {
      email: "",
      phone: "",
      barbershop: { id: barbershopId },
      roles: ["barber"] as ["barber"],
      name: "",
    },
    onSubmit: async ({ value }) => {
      try {
        await inviteBarber({
          ...value,
          phone: value.phone.trim(),
          email: value.email.trim().toLowerCase(),
          barbershop: { id: barbershopId },
        });

        haptic.trigger("success");
        toast.success("Invitación enviada correctamente");
        form.reset();
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
      <FieldGroup className="gap-4">
        <form.AppField name="email">
          {(field) => (
            <field.TextField
              label="Correo electrónico"
              placeholder="barbero@correo.com"
              type="email"
              description="Asegúrate de que el usuario tenga una cuenta en la aplicación."
            />
          )}
        </form.AppField>

        <form.AppField name="phone">
          {(field) => (
            <field.TextField
              label="Teléfono"
              placeholder="3119871234"
              type="tel"
            />
          )}
        </form.AppField>
      </FieldGroup>

      <form.AppForm>
        <form.SubmitButton label="Invitar" className="w-full" />
      </form.AppForm>
    </form>
  );
};
