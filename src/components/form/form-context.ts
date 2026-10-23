import { createFormHookContexts, useSelector } from "@tanstack/react-form";
import type { FocusEventHandler } from "react";

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

/** Field errors in the shape <FieldError> renders. */
type FieldErrorList = Array<{ message?: string } | undefined>;

/** The current field's validation errors, re-rendering only when they change. */
export function useFieldErrors(): FieldErrorList {
  const field = useFieldContext<unknown>();
  return useSelector(
    field.store,
    // oxlint-disable-next-line typescript/no-unsafe-return -- SAFETY: the app's form validators are zod schemas, whose issues carry `message`; the form contexts type field errors as any.
    (state): FieldErrorList => state.meta.errors,
  );
}

/**
 * Shared by TextField/AddonField: forward the caller's onFocus, then
 * select-all on number inputs so typing replaces the value.
 */
export function numberSelectOnFocus(
  type: string | undefined,
  onFocus: FocusEventHandler<HTMLInputElement> | undefined,
): FocusEventHandler<HTMLInputElement> {
  return (event) => {
    onFocus?.(event);
    if (type === "number") {
      event.currentTarget.select();
    }
  };
}
