import type { Barbershop } from "@panabarbero/convex/schemas";

import { Skeleton } from "@/components/ui/skeleton";

interface BarbershopAvatarProps {
  barbershop: Barbershop | null;
  isLoading?: boolean;
}

export const BarbershopAvatar = (props: BarbershopAvatarProps) => {
  const { barbershop, isLoading } = props;

  if (isLoading) {
    return (
      <Skeleton className="size-16 rounded-full object-cover md:size-24 lg:size-28" />
    );
  }

  return (
    <div className="relative">
      <img
        loading="lazy"
        decoding="async"
        alt={`Banner de ${barbershop?.name}`}
        src={barbershop?.bannerUrl ?? "/default-logo.png"}
        style={{ viewTransitionName: `barbershop-${barbershop?.uuid}-banner` }}
        className="size-16 rounded-full object-cover md:size-24 lg:size-28"
      />
    </div>
  );
};
