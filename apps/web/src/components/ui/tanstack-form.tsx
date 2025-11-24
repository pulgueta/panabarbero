import {
  createFormHook,
  createFormHookContexts,
  revalidateLogic,
  useStore,
} from "@tanstack/react-form";
import type {
  ComponentProps,
  ComponentPropsWithoutRef,
  FormEvent,
  ReactNode,
} from "react";
import { createContext, useCallback, useContext, useId } from "react";

import type { ButtonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import type { FieldVariants } from "@/components/ui/field";
import {
  Field as DefaultField,
  FieldError as DefaultFieldError,
  FieldSet as DefaultFieldSet,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldTitle,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const {
  fieldContext,
  formContext,
  useFieldContext: _useFieldContext,
  useFormContext,
} = createFormHookContexts();

const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    Field,
    FieldError,
    FieldSet,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSeparator,
    FieldTitle,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
  },
  formComponents: {
    SubmitButton,
    StepButton,
    FieldLegend,
    FieldDescription,
    FieldSeparator,
    Form,
  },
});

type FormItemContextValue = {
  id: string;
};

const FormItemContext = createContext<FormItemContextValue>(
  {} as FormItemContextValue,
);

function FieldSet({
  className,
  children,
  ...props
}: ComponentProps<"fieldset">) {
  const id = useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <DefaultFieldSet className={cn("grid gap-1", className)} {...props}>
        {children}
      </DefaultFieldSet>
    </FormItemContext.Provider>
  );
}

const useFieldContext = () => {
  const { id } = useContext(FormItemContext);
  const { name, store, ...fieldContext } = _useFieldContext();

  const errors = useStore(store, (state) => state.meta.errors);
  if (!fieldContext) {
    throw new Error("useFieldContext should be used within <FormItem>");
  }

  return {
    id,
    name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    errors,
    store,
    ...fieldContext,
  };
};

function Field({ children, ...props }: ComponentProps<"div"> & FieldVariants) {
  const {
    errors,
    formItemId,
    formDescriptionId,
    formMessageId,
    handleBlur,
    store,
  } = useFieldContext();
  const isTouched = useStore(store, (state) => state.meta.isTouched);
  const hasVisibleErrors = !!errors.length && isTouched;

  return (
    <DefaultField
      data-invalid={hasVisibleErrors}
      id={formItemId}
      onBlur={handleBlur}
      aria-describedby={
        !hasVisibleErrors
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={hasVisibleErrors}
      {...props}
    >
      {children}
    </DefaultField>
  );
}

function FieldError({ className, ...props }: ComponentProps<"p">) {
  const { errors, formMessageId, store } = useFieldContext();
  const isTouched = useStore(store, (state) => state.meta.isTouched);
  const body = errors.length ? String(errors.at(0)?.message ?? "") : "";
  if (!body || !isTouched) return null;
  return (
    <DefaultFieldError
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-destructive text-sm", className)}
      {...props}
      errors={body ? [{ message: body }] : []}
    />
  );
}

function Form({
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<"form">, "onSubmit" & "noValidate"> & {
  children?: ReactNode;
}) {
  const form = useFormContext();
  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      e.stopPropagation();
      form.handleSubmit();
    },
    [form],
  );
  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "mx-auto flex w-full flex-col gap-2 p-2 md:p-5",
        props.className,
      )}
      noValidate
      {...props}
    >
      {children}
    </form>
  );
}

function SubmitButton({
  label,
  className,
  size,
  ...props
}: ComponentProps<"button"> &
  ButtonVariants & {
    label: string;
  }) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button
          className={className}
          size={size}
          type="submit"
          disabled={isSubmitting}
          {...props}
        >
          {isSubmitting && <Spinner />}
          {label}
        </Button>
      )}
    </form.Subscribe>
  );
}

function StepButton({
  label,
  handleMovement,
  ...props
}: ComponentProps<"button"> &
  ButtonVariants & {
    label: ReactNode | string;
    handleMovement: () => void;
  }) {
  return (
    <Button variant="ghost" type="button" onClick={handleMovement} {...props}>
      {label}
    </Button>
  );
}

export {
  revalidateLogic,
  useAppForm,
  useFieldContext,
  useFormContext,
  withFieldGroup,
  withForm,
};
