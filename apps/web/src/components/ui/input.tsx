import { Input as InputPrimitive } from "@base-ui/react/input";
import type { ComponentProps, FC } from "react";

import { cn } from "@/lib/utils";

type InputProps = ComponentProps<"input">;

export const Input: FC<InputProps> = ({ className, type, ...props }) => (
  <InputPrimitive
    type={type}
    data-slot="input"
    className={cn(
      "h-9 w-full min-w-0 rounded-md border border-border bg-transparent px-2.5 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground placeholder:text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
      className,
    )}
    data-1p-ignore={process.env.NODE_ENV === "development"}
    {...props}
  />
);
