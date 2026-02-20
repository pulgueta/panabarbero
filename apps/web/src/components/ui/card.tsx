import type { ComponentProps, FC } from "react";

import { cn } from "@/lib/utils";

type CardProps = ComponentProps<"div"> & { size?: "default" | "sm" };

export const Card: FC<CardProps> = ({
  className,
  size = "default",
  ...props
}) => (
  <div
    data-slot="card"
    data-size={size}
    className={cn(
      "group/card flex flex-col gap-6 overflow-hidden rounded-xl bg-card py-6 text-card-foreground text-sm shadow-xs ring-1 ring-foreground/10 has-[>img:first-child]:pt-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
      className,
    )}
    {...props}
  />
);

type CardHeaderProps = ComponentProps<"div">;

export const CardHeader: FC<CardHeaderProps> = ({ className, ...props }) => (
  <div
    data-slot="card-header"
    className={cn(
      "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] group-data-[size=sm]/card:px-4 [.border-b]:pb-6 group-data-[size=sm]/card:[.border-b]:pb-4",
      className,
    )}
    {...props}
  />
);

type CardTitleProps = ComponentProps<"div">;

export const CardTitle: FC<CardTitleProps> = ({ className, ...props }) => (
  <div
    data-slot="card-title"
    className={cn(
      "font-medium text-base leading-normal group-data-[size=sm]/card:text-sm",
      className,
    )}
    {...props}
  />
);

type CardDescriptionProps = ComponentProps<"div">;

export const CardDescription: FC<CardDescriptionProps> = ({
  className,
  ...props
}) => (
  <div
    data-slot="card-description"
    className={cn("text-muted-foreground text-sm", className)}
    {...props}
  />
);

type CardActionProps = ComponentProps<"div">;

export const CardAction: FC<CardActionProps> = ({ className, ...props }) => (
  <div
    data-slot="card-action"
    className={cn(
      "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
      className,
    )}
    {...props}
  />
);

type CardContentProps = ComponentProps<"div">;

export const CardContent: FC<CardContentProps> = ({ className, ...props }) => (
  <div
    data-slot="card-content"
    className={cn("px-6 group-data-[size=sm]/card:px-4", className)}
    {...props}
  />
);

type CardFooterProps = ComponentProps<"div">;

export const CardFooter: FC<CardFooterProps> = ({ className, ...props }) => (
  <div
    data-slot="card-footer"
    className={cn(
      "flex items-center rounded-b-xl px-6 group-data-[size=sm]/card:px-4 [.border-t]:pt-6 group-data-[size=sm]/card:[.border-t]:pt-4",
      className,
    )}
    {...props}
  />
);
