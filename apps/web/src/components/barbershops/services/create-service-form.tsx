import { zodResolver } from "@hookform/resolvers/zod";
import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useServiceActions } from "@/hooks/use-services";
import { serviceFormSchema } from "@/lib/schemas";

interface CreateServiceFormProps {
  barbershopId: Barbershop["_id"];
}

export const CreateServiceForm: FC<CreateServiceFormProps> = ({
  barbershopId,
}) => {
  const formIds = {
    form: useId(),
    name: useId(),
    price: useId(),
    duration: useId(),
  };

  const form = useForm({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      price: undefined,
      duration: 5,
      barbershopId,
    },
  });

  const {
    createServiceMutation: { mutateAsync: createService, isPending },
  } = useServiceActions();

  const onSubmit = form.handleSubmit(async (data) => {
    await createService({
      service: {
        ...data,
        uuid: crypto.randomUUID(),
        barbershopId,
      },
    });

    form.reset();
  });

  return (
    <form id={formIds.form} onSubmit={onSubmit} className="space-y-4">
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={formIds.name}>
                Nombre del servicio
              </FieldLabel>
              <Input
                {...field}
                id={formIds.name}
                aria-invalid={fieldState.invalid}
                placeholder="Corte de pelo"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="duration"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.duration}>
                  Duración (minutos)
                </FieldLabel>
                {/* @ts-expect-error */}
                <Input
                  {...field}
                  id={formIds.duration}
                  aria-invalid={fieldState.invalid}
                  type="number"
                  placeholder="30"
                  className="w-full tabular-nums"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="price"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.price}>Precio</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>$</InputGroupText>
                  </InputGroupAddon>
                  {/* @ts-expect-error */}
                  <InputGroupInput
                    {...field}
                    id={formIds.price}
                    aria-invalid={fieldState.invalid}
                    type="number"
                    placeholder="30000"
                    className="w-full tabular-nums"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>COP</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <Button type="submit" disabled={isPending} className="mt-4 w-full">
        {isPending ? <Spinner /> : "Agregar servicio"}
      </Button>
    </form>
  );
};
