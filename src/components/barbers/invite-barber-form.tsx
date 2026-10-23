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

type InviteRole = "barber" | "staff";

function isInviteRole(value: unknown): value is InviteRole {
  return value === "barber" || value === "staff";
}

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

  const defaultRoles: InviteRole[] = ["barber"];

  const form = useAppForm({
    onSubmitInvalid: () => {
      void haptic.trigger("error");
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
      roles: defaultRoles,
    },
    onSubmit: async ({ value }) => {
      try {
        await inviteBarber({
          roles: value.roles,
          email: value.email.trim().toLowerCase(),
        });

        void haptic.trigger("success");
        toast.success("Invitación enviada correctamente");
        form.reset();
      } catch (error) {
        void haptic.trigger("error");
        toast.error(getConvexErrorMessage(error));
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
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
                <p
                  id="invite-role-label"
                  className="select-none font-medium text-sm leading-none"
                >
                  Rol
                </p>
                <RadioGroup
                  aria-labelledby="invite-role-label"
                  value={field.state.value[0]}
                  onValueChange={(value) => {
                    if (isInviteRole(value)) field.handleChange([value]);
                  }}
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
