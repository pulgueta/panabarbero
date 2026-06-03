import { createFormHook } from "@tanstack/react-form";
import { lazy } from "react";

import { fieldContext, formContext } from "./form-context";

const TextField = lazy(() =>
  import("./text-field").then((module) => ({
    default: module.TextField,
  })),
);
const TextAreaField = lazy(() =>
  import("./text-field").then((module) => ({
    default: module.TextAreaField,
  })),
);
const PasswordField = lazy(() =>
  import("./text-field").then((module) => ({
    default: module.PasswordField,
  })),
);
const SelectField = lazy(() =>
  import("./select-field").then((module) => ({
    default: module.SelectField,
  })),
);
const SwitchField = lazy(() =>
  import("./switch-field").then((module) => ({
    default: module.SwitchField,
  })),
);
const CheckboxField = lazy(() =>
  import("./checkbox-field").then((module) => ({
    default: module.CheckboxField,
  })),
);
const RadioGroupField = lazy(() =>
  import("./radio-group-field").then((module) => ({
    default: module.RadioGroupField,
  })),
);
const ResetButton = lazy(() =>
  import("./reset-button").then((module) => ({
    default: module.ResetButton,
  })),
);
const SubmitButton = lazy(() =>
  import("./submit-button").then((module) => ({
    default: module.SubmitButton,
  })),
);

export const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
    TextAreaField,
    PasswordField,
    SelectField,
    SwitchField,
    CheckboxField,
    RadioGroupField,
  },
  formComponents: { SubmitButton, ResetButton },
  fieldContext,
  formContext,
});
