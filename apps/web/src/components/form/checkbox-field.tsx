import { useStore } from "@tanstack/react-form";
import type { FC } from "react";
import { useWebHaptics } from "web-haptics/react";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useFieldContext } from "./form-context";

interface CheckboxFieldProps {
  label: string;
}

export const CheckboxField: FC<CheckboxFieldProps> = ({ label }) => {
  const field = useFieldContext<boolean>();

  const errors = useStore(field.store, (state) => state.meta.errors);

  const haptic = useWebHaptics();

  const isInvalid = field.state.meta.isTouched && errors.length > 0;

  return (
    <Field data-invalid={isInvalid}>
      <div className="flex items-center gap-2">
        <Checkbox
          id={field.name}
          name={field.name}
          aria-invalid={isInvalid}
          checked={field.state.value}
          onCheckedChange={(checked) => {
            haptic.trigger("selection");
            field.handleChange(checked);
          }}
        />
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      </div>

      {isInvalid && <FieldError errors={errors} />}
    </Field>
  );
};
