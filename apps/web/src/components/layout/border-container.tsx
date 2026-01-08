import type { ComponentProps, FC, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

interface BorderContainerProps
  extends PropsWithChildren,
    ComponentProps<"section"> {}

export const BorderContainer: FC<BorderContainerProps> = ({
  className,
  ...props
}) => {
  return (
    <section
      className={cn(
        "container mx-auto min-h-[calc(100dvh-64px)] border-x bg-accent/20 px-4 pt-4 pb-24 md:px-8 md:pb-32 lg:px-10",
        className,
      )}
      {...props}
    />
  );
};
