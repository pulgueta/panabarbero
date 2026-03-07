import type { Barbershop } from "@convex/tables";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FC } from "react";
import { useEffect, useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopMemberActions } from "@/hooks/use-barbershop-members";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { inviteBarberFormSchema } from "@/lib/schemas";

interface InviteBarberFormProps {
  barbershopId: Barbershop["_id"];
  /** When provided, form uses this id and does not render the submit button (caller puts it in a footer). */
  formId?: string;
  /** Called when invite submission loading state changes (for footer button disabled state). */
  onLoadingChange?: (loading: boolean) => void;
}

export const InviteBarberForm: FC<InviteBarberFormProps> = ({
  barbershopId,
  formId: formIdProp,
  onLoadingChange,
}) => {
  const formIdGenerated = useId();
  const formId = formIdProp ?? formIdGenerated;
  const formIds = {
    name: useId(),
    phone: useId(),
    email: useId(),
    roles: useId(),
    form: formId,
  };

  const form = useForm({
    resolver: zodResolver(inviteBarberFormSchema),
    defaultValues: {
      email: "",
      phone: "",
      barbershopId,
      roles: ["barber"],
    },
  });

  const haptic = useWebHaptics();

  const {
    inviteBarberMutation: {
      isPending: isInvitingBarber,
      mutateAsync: inviteBarber,
    },
  } = useBarbershopMemberActions();

  const onSubmit = form.handleSubmit(async (formData) => {
    try {
      await inviteBarber({
        ...formData,
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
      });

      haptic.trigger("success");
      toast.success("Invitación enviada correctamente");
      form.reset();
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
      return;
    }
  });

  const renderSubmitInForm = formIdProp == null;

  useEffect(() => {
    onLoadingChange?.(isInvitingBarber);
  }, [isInvitingBarber, onLoadingChange]);

  return (
    <form id={formIds.form} onSubmit={onSubmit}>
      <FieldGroup className="gap-4">
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={formIds.email}>
                Correo electrónico
              </FieldLabel>
              <Input
                {...field}
                id={formIds.email}
                aria-invalid={fieldState.invalid}
                placeholder="barbero@correo.com"
                type="email"
              />
              <FieldDescription>
                Asegúrate de que el usuario tenga una cuenta en la aplicación.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="phone"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={formIds.phone}>Teléfono</FieldLabel>
              <Input
                {...field}
                id={formIds.phone}
                aria-invalid={fieldState.invalid}
                placeholder="3119871234"
                type="tel"
              />

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      {renderSubmitInForm && (
        <Button
          type="submit"
          disabled={isInvitingBarber}
          className="mt-4 w-full"
        >
          {isInvitingBarber && <Spinner />} Invitar
        </Button>
      )}
    </form>
  );
};
