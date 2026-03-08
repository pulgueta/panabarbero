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
}

export const SubmitButton: FC<SubmitButtonProps> = ({
  label,
  className,
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
          disabled={!canSubmit || isPristine || isSubmitting}
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
