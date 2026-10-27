import { useStore } from "@tanstack/react-form";
import type { ComponentProps, FC } from "react";
import { useWebHaptics } from "web-haptics/react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { useFieldContext } from "./form-context";

interface SwitchFieldProps extends ComponentProps<typeof Switch> {
  label: string;
}

export const SwitchField: FC<SwitchFieldProps> = ({ label, ...props }) => {
  const field = useFieldContext<boolean>();

  const errors = useStore(field.store, (state) => state.meta.errors);

  const haptic = useWebHaptics();

  const isInvalid = field.state.meta.isTouched && errors.length > 0;

  return (
    <Field data-invalid={isInvalid}>
      <div className="flex items-center gap-3">
        <Switch
          id={field.name}
          name={field.name}
          checked={field.state.value}
          onCheckedChange={(checked) => {
            haptic.trigger("selection");
            field.handleChange(checked);
          }}
          aria-invalid={isInvalid}
          {...props}
        />
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      </div>

      {isInvalid && <FieldError errors={errors} />}
    </Field>
  );
};
