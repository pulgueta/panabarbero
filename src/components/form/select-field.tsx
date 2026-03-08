import { useStore } from "@tanstack/react-form";
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
import { useFieldContext } from "./form-context";

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

  const errors = useStore(field.store, (state) => state.meta.errors);

  const isInvalid = field.state.meta.isTouched && errors.length > 0;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>

      <Select
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value as string)}
        {...props}
      >
        <SelectTrigger
          id={field.name}
          aria-invalid={isInvalid}
          className={cn(className)}
        >
          <SelectValue placeholder={placeholder ?? "Selecciona una opción"} />
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
