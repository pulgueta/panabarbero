import type { ComponentProps, FC } from "react";

import { cn } from "@/lib/utils";

type CardProps = ComponentProps<"article"> & { size?: "default" | "sm" };

export const Card: FC<CardProps> = ({
  className,
  size = "default",
  ...props
}) => (
  <article
    data-slot="card"
    data-size={size}
    className={cn(
      "group/card flex flex-col gap-6 overflow-hidden rounded-xl border border-border bg-card py-4 text-card-foreground text-sm [scrollbar-gutter:auto] has-[>img:first-child]:pt-0 has-data-[slot=card-footer]:pb-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
      className,
    )}
    {...props}
  />
);

type CardHeaderProps = ComponentProps<"header">;

export const CardHeader: FC<CardHeaderProps> = ({ className, ...props }) => (
  <header
    data-slot="card-header"
    className={cn(
      "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] group-data-[size=sm]/card:px-4 [.border-b]:pb-6 group-data-[size=sm]/card:[.border-b]:pb-4",
      className,
    )}
    {...props}
  />
);

type CardTitleProps = ComponentProps<"h3">;

export const CardTitle: FC<CardTitleProps> = ({ className, ...props }) => (
  // eslint-disable-next-line jsx-a11y/heading-has-content
  <h3
    data-slot="card-title"
    className={cn(
      "text-balance font-semibold text-xl leading-normal tracking-tight group-data-[size=sm]/card:text-lg",
      className,
    )}
    {...props}
  />
);

type CardDescriptionProps = ComponentProps<"p">;

export const CardDescription: FC<CardDescriptionProps> = ({
  className,
  ...props
}) => (
  <p
    data-slot="card-description"
    className={cn(
      "text-pretty text-muted-foreground text-sm tracking-tight",
      className,
    )}
    {...props}
  />
);

type CardContentProps = ComponentProps<"section">;

export const CardContent: FC<CardContentProps> = ({ className, ...props }) => (
  <section
    data-slot="card-content"
    className={cn("px-4 group-data-[size=sm]/card:px-4", className)}
    {...props}
  />
);

type CardFooterProps = ComponentProps<"footer">;

export const CardFooter: FC<CardFooterProps> = ({ className, ...props }) => (
  <footer
    data-slot="card-footer"
    className={cn(
      "mt-auto flex min-h-fit items-center rounded-b-xl border-border border-t bg-accent/50 p-4 group-data-[size=sm]/card:px-4",
      className,
    )}
    {...props}
  />
);
