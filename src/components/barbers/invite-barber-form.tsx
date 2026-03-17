import { inviteBarberSchema } from "@convex/invitations";
import { revalidateLogic } from "@tanstack/react-form";
import type { FC } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useBarbershopMemberActions } from "@/hooks/use-barbershop-members";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { formatPhoneNumber } from "@/lib/utils";

interface InviteBarberFormProps {
  canInviteStaff?: boolean;
}

export const InviteBarberForm: FC<InviteBarberFormProps> = ({
  canInviteStaff = false,
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
      onSubmit: inviteBarberSchema,
    },
    defaultValues: {
      email: "",
      phone: "",
      roles: ["barber"] as ("barber" | "staff")[],
    },
    onSubmit: async ({ value }) => {
      try {
        await inviteBarber({
          ...value,
          phone: formatPhoneNumber(value.phone),
          email: value.email.trim().toLowerCase(),
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
              placeholder="miembro@correo.com"
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

        {canInviteStaff && (
          <form.AppField name="roles">
            {(field) => (
              <div className="space-y-2">
                <Label>Rol</Label>
                <RadioGroup
                  value={field.state.value[0]}
                  onValueChange={(value) =>
                    field.handleChange([value as "barber" | "staff"])
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="barber" id="role-barber" />
                    <Label htmlFor="role-barber" className="font-normal">
                      Barbero
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="staff" id="role-staff" />
                    <Label htmlFor="role-staff" className="font-normal">
                      Recepcionista
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </form.AppField>
        )}
      </FieldGroup>

      <form.AppForm>
        <form.SubmitButton label="Invitar" className="w-full" />
      </form.AppForm>
    </form>
  );
};
