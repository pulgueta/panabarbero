import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { FC, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const containerVariants = cva("mx-auto w-full", {
  variants: {
    variant: {
      xs: "max-w-xs",
      sm: "max-w-xl",
      md: "max-w-2xl",
      lg: "max-w-5xl",
      xl: "max-w-6xl",
      "2xl": "max-w-7xl",
    },
    rounded: {
      xs: "rounded-xs",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      "2xl": "rounded-2xl",
    },
    fullWidth: {
      true: "max-w-none rounded-none",
    },
    fullHeight: {
      true: "min-h-dvh",
    },
  },
  defaultVariants: {
    variant: "md",
    rounded: "sm",
    fullWidth: false,
    fullHeight: false,
  },
});

type As =
  | "div"
  | "section"
  | "article"
  | "main"
  | "header"
  | "footer"
  | "aside"
  | "nav"
  | "form";

export interface ContainerProps
  extends HTMLAttributes<HTMLElement>,
    VariantProps<typeof containerVariants> {
  as?: As;
}

export const Container: FC<ContainerProps> = ({
  as,
  variant,
  rounded,
  fullWidth,
  fullHeight,
  className,
  ...props
}) => {
  const Comp = as ?? "div";

  return (
    <Comp
      {...props}
      className={cn(
        containerVariants({
          variant,
          rounded,
          fullWidth,
          fullHeight,
          className,
        }),
      )}
    />
  );
};
