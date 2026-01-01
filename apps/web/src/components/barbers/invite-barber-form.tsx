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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
    inviteBarberMutation: { isPending, mutateAsync: inviteBarber },
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

        <Controller
          name="roles"
          control={form.control}
          render={({ field, fieldState }) => {
            const currentValue =
              Array.isArray(field.value) && field.value.length > 0
                ? field.value[0]
                : "barber";

            return (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.roles}>Rol</FieldLabel>
                <FieldDescription>
                  Selecciona el rol que tendrá la persona invitada en la
                  barbería.
                </FieldDescription>
                <RadioGroup
                  value={currentValue}
                  onValueChange={(value) =>
                    field.onChange([value as "barber" | "staff"])
                  }
                  className="grid grid-cols-2 gap-2"
                >
                  {(["barber", "staff"] as const).map((role) => {
                    const roleLabel = role === "barber" ? "Barbero" : "Staff";

                    return (
                      <div className="flex items-center gap-3" key={role}>
                        <RadioGroupItem value={role} id={role} />
                        <Label htmlFor={role} className="cursor-pointer">
                          {roleLabel}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            );
          }}
        />
      </FieldGroup>

      <Button type="submit" disabled={isPending} className="mt-4 w-full">
        {isPending ? <Spinner /> : "Invitar"}
      </Button>
    </form>
  );
};
