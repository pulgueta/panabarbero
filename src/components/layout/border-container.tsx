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
    <div className="md:px-4">
      <section
        className={cn(
          "mx-auto min-h-[calc(100dvh-110px)] w-full max-w-450 space-y-4 border-x bg-accent/20 px-4 pt-4 pb-24 md:min-h-[calc(100dvh-65px)] md:px-8 md:pb-32 lg:px-10",
          className,
        )}
        {...props}
      />
    </div>
  );
};
