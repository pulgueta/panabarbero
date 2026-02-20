import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, FC } from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 has-data-[slot=alert-action]:pr-18 *:[svg:not([class*='size-'])]:size-4 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type AlertProps = ComponentProps<"div"> & VariantProps<typeof alertVariants>;

export const Alert: FC<AlertProps> = ({ className, variant, ...props }) => (
  <div
    data-slot="alert"
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
);

type AlertTitleProps = ComponentProps<"div">;

export const AlertTitle: FC<AlertTitleProps> = ({ className, ...props }) => (
  <div
    data-slot="alert-title"
    className={cn(
      "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
      className,
    )}
    {...props}
  />
);

type AlertDescriptionProps = ComponentProps<"div">;

export const AlertDescription: FC<AlertDescriptionProps> = ({
  className,
  ...props
}) => (
  <div
    data-slot="alert-description"
    className={cn(
      "text-balance text-muted-foreground text-sm md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
      className,
    )}
    {...props}
  />
);

type AlertActionProps = ComponentProps<"div">;

export const AlertAction: FC<AlertActionProps> = ({ className, ...props }) => (
  <div
    data-slot="alert-action"
    className={cn("absolute top-2.5 right-3", className)}
    {...props}
  />
);
