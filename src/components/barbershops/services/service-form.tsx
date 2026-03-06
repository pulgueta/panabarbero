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
import type { ServiceFormData, serviceFormSchema } from "@/lib/schemas";
import type { BaseSyntheticEvent, FC } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { output } from "zod";

interface ServiceFormProps {
  initialValues?: ServiceFormData;
  form: UseFormReturn<output<typeof serviceFormSchema>>;
  onSubmit: (e: BaseSyntheticEvent) => void;
  formIds: {
    form: string;
    name: string;
    price: string;
    duration: string;
  };
}

export const ServiceForm: FC<ServiceFormProps> = ({
  form,
  onSubmit,
  formIds,
}) => {
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
                  Duración (en minutos)
                </FieldLabel>
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
    </form>
  );
};
