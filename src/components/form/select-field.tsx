import type { ComponentProps, FC } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useFieldContext, useFieldErrors } from "./form-context";

interface SelectFieldProps extends ComponentProps<typeof Select> {
  label: string;
  placeholder?: string;
  className?: string;
  options: { value: string; label: string }[];
}

export const SelectField: FC<SelectFieldProps> = ({
  label,
  placeholder,
  className,
  options,
  ...props
}) => {
  const field = useFieldContext<string>();

  const errors = useFieldErrors();

  const isInvalid = field.state.meta.isTouched && errors.length > 0;

  const selectedLabel = options.find(
    (option) => option.value === field.state.value,
  )?.label;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>

      <Select
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => {
          // values only come from `options`; resolve back to its typed string
          const option = options.find((item) => item.value === value);
          if (option) field.handleChange(option.value);
        }}
        {...props}
      >
        <SelectTrigger
          id={field.name}
          aria-invalid={isInvalid}
          className={cn(className)}
        >
          <SelectValue placeholder={placeholder ?? "Selecciona una opción"}>
            {selectedLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isInvalid && <FieldError errors={errors} />}
    </Field>
  );
};
