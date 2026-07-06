import { useStore } from "@tanstack/react-form";
import type { ComponentProps, FC, ReactNode } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { numberSelectOnFocus, useFieldContext } from "./form-context";

interface AddonFieldProps
  extends Omit<ComponentProps<typeof InputGroupInput>, "prefix"> {
  label: string;
  description?: string;
  /** Leading addon — e.g. "COP" on money inputs. */
  addonStart?: ReactNode;
  /** Trailing addon — e.g. the product's unit ("und", "ml"). */
  addonEnd?: ReactNode;
}

/**
 * TextField variant whose input carries a unit/currency addon (InputGroup).
 * Same contract as TextField: callers may override `value`/`onChange` via
 * props for number parsing.
 */
export const AddonField: FC<AddonFieldProps> = ({
  label,
  description,
  addonStart,
  addonEnd,
  onFocus,
  type,
  ...props
}) => {
  const field = useFieldContext<string | number | undefined>();

  const errors = useStore(field.store, (state) => state.meta.errors);

  const isInvalid = field.state.meta.isTouched && errors.length > 0;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <InputGroup>
        {addonStart ? (
          <InputGroupAddon>
            <InputGroupText>{addonStart}</InputGroupText>
          </InputGroupAddon>
        ) : null}
        <InputGroupInput
          id={field.name}
          name={field.name}
          type={type}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          onFocus={numberSelectOnFocus(type, onFocus)}
          aria-invalid={isInvalid}
          {...props}
        />
        {addonEnd ? (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{addonEnd}</InputGroupText>
          </InputGroupAddon>
        ) : null}
      </InputGroup>

      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError errors={errors} />}
    </Field>
  );
};
