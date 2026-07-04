import type { FC } from "react";

import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useFormContext } from "./form-context";

interface SubmitButtonProps {
  label: string;
  className?: string;
  variant?: ButtonProps["variant"];
  /** When false, a pristine form can still submit (e.g. stock adjust defaults). */
  requireDirty?: boolean;
  /** Enables submit even when the form is pristine (e.g. photo-only edits). */
  forceEnabled?: boolean;
}

export const SubmitButton: FC<SubmitButtonProps> = ({
  label,
  className,
  requireDirty = true,
  forceEnabled = false,
  ...props
}) => {
  const form = useFormContext();

  return (
    <form.Subscribe
      selector={(state) => [
        state.canSubmit,
        state.isSubmitting,
        state.isPristine,
      ]}
    >
      {([canSubmit, isSubmitting, isPristine]) => (
        <Button
          type="submit"
          disabled={
            !canSubmit ||
            isSubmitting ||
            (requireDirty && isPristine && !forceEnabled)
          }
          className={cn(className)}
          {...props}
        >
          {isSubmitting && <Spinner />}
          {label}
        </Button>
      )}
    </form.Subscribe>
  );
};
