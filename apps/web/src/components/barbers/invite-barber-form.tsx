import { zodResolver } from "@hookform/resolvers/zod";
import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

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
}

export const InviteBarberForm: FC<InviteBarberFormProps> = ({
  barbershopId,
}) => {
  const formIds = {
    name: useId(),
    phone: useId(),
    email: useId(),
    roles: useId(),
    form: useId(),
  };

  const form = useForm({
    // @ts-expect-error - zod's coerce method returns an unknown type
    resolver: zodResolver(inviteBarberFormSchema),
    defaultValues: {
      email: "",
      phone: "",
      barbershopId,
      roles: ["barber"],
    },
  });

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

      toast.success("Invitación enviada correctamente");
      form.reset();
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      return;
    }
  });

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
                Se recomienda usar un correo electrónico para poder enviarle el
                link de invitación al barbero.
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

      <Button type="submit" disabled={isInvitingBarber} className="mt-4 w-full">
        {isInvitingBarber && <Spinner />} Invitar
      </Button>
    </form>
  );
};
