import { zodResolver } from "@hookform/resolvers/zod";
import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";

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
import { useBarberActions } from "@/hooks/use-barbers";
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
    form: useId(),
  };

  const form = useForm({
    resolver: zodResolver(inviteBarberFormSchema),
    defaultValues: {
      name: "",
      email: undefined,
      phone: "",
      barbershopId,
    },
  });

  console.log(form.formState.defaultValues);

  const {
    inviteBarberMutation: { isPending },
  } = useBarberActions();

  const onSubmit = form.handleSubmit(async (formData) => {
    console.log(formData);
  });

  return (
    <form id={formIds.form} onSubmit={onSubmit}>
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.name}>Nombre</FieldLabel>
                <Input
                  {...field}
                  id={formIds.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="Marcos Aguilar"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
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

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

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
      </FieldGroup>

      <Button type="submit" disabled={isPending} className="mt-4 w-full">
        {isPending ? <Spinner /> : "Invitar"}
      </Button>
    </form>
  );
};
