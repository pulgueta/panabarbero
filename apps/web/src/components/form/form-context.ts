import { createFormHookContexts } from "@tanstack/react-form";
import type { FocusEventHandler } from "react";

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

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
