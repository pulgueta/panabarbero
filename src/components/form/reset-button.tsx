import type { FC } from "react";

import type { ButtonProps } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFormContext } from "./form-context";

interface ResetButtonProps {
  label: string;
  className?: string;
  variant?: ButtonProps["variant"];
}

export const ResetButton: FC<ResetButtonProps> = ({
  label,
  className,
  ...props
}) => {
  const form = useFormContext();

  return (
    <Button
      type="button"
      onClick={() => form.reset()}
      disabled={form.state.isSubmitting}
      className={cn(className)}
      {...props}
    >
      {label}
    </Button>
  );
};
