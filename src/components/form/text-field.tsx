import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import type { ComponentProps, FC, ReactNode } from "react";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFieldContext } from "./form-context";

interface TextFieldProps extends ComponentProps<typeof Input> {
  label: string;
  description?: string;
}

export const TextField: FC<TextFieldProps> = ({
  label,
  description,
  ...props
}) => {
  const field = useFieldContext<string>();

  const errors = useStore(field.store, (state) => state.meta.errors);

  const isInvalid = field.state.meta.isTouched && errors.length > 0;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
        {...props}
      />

      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError errors={errors} />}
    </Field>
  );
};

interface PasswordFieldProps extends ComponentProps<typeof Input> {
  label: string;
  description?: string;
  labelSuffix?: ReactNode;
}

export const PasswordField: FC<PasswordFieldProps> = ({
  label,
  description,
  labelSuffix,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const field = useFieldContext<string>();
  const errors = useStore(field.store, (state) => state.meta.errors);

  const isInvalid = field.state.meta.isTouched && errors.length > 0;

  return (
    <Field data-invalid={isInvalid}>
      <div className="flex w-full items-center gap-2">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>

        {labelSuffix}
      </div>
      <div className="relative w-full">
        <Input
          id={field.name}
          name={field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          aria-invalid={isInvalid}
          placeholder="********"
          autoComplete="current-password"
          maxLength={64}
          type={showPassword ? "text" : "password"}
          {...props}
        />
        <button
          type="button"
          className={buttonVariants({
            className: "absolute right-0",
            size: "icon",
            variant: "ghost",
          })}
          onClick={() => setShowPassword(!showPassword)}
          aria-label={
            showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
          }
        >
          {showPassword ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
        </button>
      </div>

      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError errors={errors} />}
    </Field>
  );
};

interface TextAreaFieldProps extends ComponentProps<typeof Textarea> {
  label: string;
  description?: string;
}

export const TextAreaField: FC<TextAreaFieldProps> = ({
  label,
  description,
  ...props
}) => {
  const field = useFieldContext<string>();

  const errors = useStore(field.store, (state) => state.meta.errors);

  const isInvalid = field.state.meta.isTouched && errors.length > 0;

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={isInvalid}
        {...props}
      />

      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError errors={errors} />}
    </Field>
  );
};
