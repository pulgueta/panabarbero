import type { BaseSyntheticEvent, FC } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { output } from "zod";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import type { cancelAppointmentFormSchema } from "@/lib/schemas";

interface CancelAppointmentFormProps {
  isBarber: boolean;
  disabled: boolean;
  form: UseFormReturn<output<typeof cancelAppointmentFormSchema>>;
  onSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
  formIds: {
    notes: string;
    form: string;
  };
}

export const CancelAppointmentForm: FC<CancelAppointmentFormProps> = ({
  isBarber,
  disabled,
  formIds,
  form,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} id={formIds.form}>
      <FieldGroup>
        <Controller
          name="notes"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={formIds.notes}>
                Nota para el {isBarber ? "cliente" : "barbero"}
              </FieldLabel>
              <InputGroup>
                <InputGroupTextarea
                  {...field}
                  id={formIds.notes}
                  disabled={disabled}
                  placeholder="Debe contener mínimo 8 caracteres."
                  className="min-h-24 resize-none"
                  aria-invalid={fieldState.invalid}
                />
                <InputGroupAddon align="block-end">
                  <InputGroupText className="tabular-nums">
                    {field.value.length}/300 caracteres
                  </InputGroupText>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Ejemplo: Tuviste una emergencia y no podrás asistir.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
    </form>
  );
};
