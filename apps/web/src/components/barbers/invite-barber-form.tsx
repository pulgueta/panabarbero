import { inviteBarberSchema } from "@convex/invitationsSchema";
import type { Barbershop } from "@convex/schema";
import { revalidateLogic } from "@tanstack/react-form";
import type { FC } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useInvitationActions } from "@/hooks/use-invitations";
import { getConvexErrorMessage } from "@/lib/convex-errors";

interface InviteBarberFormProps {
  barbershopId: Barbershop["_id"];
  canInviteStaff?: boolean;
}

export const InviteBarberForm: FC<InviteBarberFormProps> = ({
  barbershopId,
  canInviteStaff = false,
}) => {
  const haptic = useWebHaptics();

  const {
    inviteMutation: { mutateAsync: inviteBarber },
  } = useInvitationActions(barbershopId);

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
      roles: ["barber"] as ("barber" | "staff")[],
    },
    onSubmit: async ({ value }) => {
      try {
        await inviteBarber({
          roles: value.roles,
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
              description="Le enviaremos una invitación por correo para unirse al equipo."
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
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="barber" id="role-barber" />
                    <Label htmlFor="role-barber" className="font-normal">
                      Barbero
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
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
