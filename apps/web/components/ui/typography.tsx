import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { FC, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const headingVariants = cva(
  "inline-flex scroll-m-20 items-center gap-x-2 text-balance tracking-tighter selection:bg-secondary selection:text-secondary-foreground",
  {
    variants: {
      as: {
        h1: "text-3xl md:text-4xl",
        h2: "text-2xl md:text-3xl",
        h3: "text-xl md:text-2xl",
        h4: "text-lg md:text-xl",
      },
      weight: {
        black: "font-black",
        extraBold: "font-extrabold",
        bold: "font-bold",
        semibold: "font-semibold",
        normal: "font-normal",
        light: "font-light",
      },
      fontStyle: {
        italic: "italic",
        normal: "normal",
      },
      center: {
        true: "text-center",
      },
      muted: {
        true: "text-muted-foreground",
      },
    },
    defaultVariants: {
      weight: "bold",
      as: "h1",
      fontStyle: "normal",
      center: false,
      muted: false,
    },
  },
);

interface HeadingProps
  extends HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {}

export const Heading: FC<HeadingProps> = ({
  as,
  className,
  children,
  fontStyle,
  weight,
  center = false,
  muted = false,
  ...rest
}) => {
  const Comp = as || "h1";

  return (
    <Comp
      className={cn(
        headingVariants({ className, fontStyle, as, weight, muted, center }),
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
};

const paragraphVariants = cva(
  "text-pretty selection:bg-primary selection:text-primary-foreground",
  {
    variants: {
      variant: {
        sub1: "text-base",
        body: "text-lg leading-7",
        sm: "text-sm leading-6",
      },
      weight: {
        black: "font-black",
        extraBold: "font-extrabold",
        bold: "font-bold",
        semibold: "font-semibold",
        medium: "font-medium",
        normal: "font-normal",
        light: "font-light",
      },
      fontStyle: {
        italic: "italic",
        normal: "normal",
      },
      center: {
        true: "text-center",
      },
      muted: {
        true: "text-muted-foreground",
      },
      tracking: {
        tight: "tracking-tight",
        tighter: "tracking-tighter",
      },
    },
    defaultVariants: {
      variant: "sm",
      weight: "normal",
      fontStyle: "normal",
      tracking: "tight",
      center: false,
      muted: false,
    },
  },
);

export interface ParagraphProps
  extends HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof paragraphVariants> {
  center?: boolean;
  muted?: boolean;
}

export const Paragraph: FC<ParagraphProps> = ({
  weight,
  variant,
  className,
  center = false,
  muted = false,
  ...props
}) => {
  return (
    <p
      className={cn(paragraphVariants({ className, variant, weight }), {
        "text-center": center,
        "text-muted-foreground": muted,
      })}
      {...props}
    />
  );
};

export const Blockquote: FC<HTMLAttributes<HTMLQuoteElement>> = ({
  className,
  ...props
}) => {
  return (
    <blockquote
      className={cn("text-pretty font-semibold text-xs", className)}
      {...props}
    />
  );
};
