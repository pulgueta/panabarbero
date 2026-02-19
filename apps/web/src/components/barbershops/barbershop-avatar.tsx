import type { Barbershop } from "@convex/tables";
import type { FC } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface BarbershopAvatarProps {
  barbershop: Barbershop | null;
  size?: "xs" | "sm" | "md" | "lg";
}

export const BarbershopAvatar: FC<BarbershopAvatarProps> = ({
  barbershop,
  size = "sm",
}) => {
  return (
    <div className="relative">
      {barbershop ? (
        <img
          loading="lazy"
          decoding="async"
          alt={`Banner de ${barbershop?.name}`}
          src={barbershop?.bannerUrl ?? "/default-logo.png"}
          style={{
            viewTransitionName: `barbershop-${barbershop?.uuid}-avatar`,
          }}
          className={cn("rounded-full object-cover", {
            "size-8": size === "xs",
            "size-12": size === "sm",
            "size-16": size === "md",
            "size-24": size === "lg",
          })}
        />
      ) : (
        <Skeleton className="size-16 rounded-full object-cover md:size-24 lg:size-28" />
      )}
    </div>
  );
};
