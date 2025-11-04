import type { ComponentProps, FC, PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

interface BorderContainerProps
  extends PropsWithChildren,
    ComponentProps<"div"> {}

export const BorderContainer: FC<BorderContainerProps> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        "container mx-auto min-h-[calc(100dvh-65px)] border-x px-4 py-8 pb-32 md:px-8 md:pb-0 lg:px-16",
        className,
      )}
      {...props}
    />
  );
};
