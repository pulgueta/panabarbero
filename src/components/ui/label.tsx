import type { ComponentProps, FC } from "react";

import { cn } from "@/lib/utils";

type LabelProps = ComponentProps<"label">;

export const Label: FC<LabelProps> = ({ className, ...props }) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: required by the component
  // eslint-disable-next-line jsx-a11y/label-has-associated-control
  <label
    data-slot="label"
    className={cn(
      "flex select-none items-center gap-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
      className,
    )}
    {...props}
  />
);
