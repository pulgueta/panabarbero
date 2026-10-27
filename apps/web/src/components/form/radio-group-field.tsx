import { useStore } from "@tanstack/react-form";
import type { FC } from "react";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFieldContext } from "./form-context";

interface RadioGroupFieldProps {
  label: string;
  options: { value: string; label: string; description?: string }[];
}

export const RadioGroupField: FC<RadioGroupFieldProps> = ({
  label,
  options,
}) => {
  const field = useFieldContext<string>();

  const errors = useStore(field.store, (state) => state.meta.errors);

  const isInvalid = field.state.meta.isTouched && errors.length > 0;

  const labelId = `${field.name}-label`;

  return (
    <Field data-invalid={isInvalid} data-slot="radio-group">
      <FieldLabel id={labelId}>{label}</FieldLabel>
      <RadioGroup
        name={field.name}
        value={field.state.value}
        onValueChange={field.handleChange}
      >
        {options.map((option) => (
          <FieldLabel
            key={option.value}
            htmlFor={`${field.name}-${option.value}`}
          >
            <Field orientation="horizontal" data-invalid={isInvalid}>
              <FieldContent>
                <FieldTitle>{option.label}</FieldTitle>

                {option.description && (
                  <FieldDescription>{option.description}</FieldDescription>
                )}
              </FieldContent>
              <RadioGroupItem
                value={option.value}
                id={`${field.name}-${option.value}`}
                aria-invalid={isInvalid}
              />
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>

      {isInvalid && <FieldError errors={errors} />}
    </Field>
  );
};
