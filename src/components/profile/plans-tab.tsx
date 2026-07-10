import type { FC } from "react";
import { lazy, Suspense } from "react";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useBarbershopByOwnerId } from "@/hooks/barbershop/use-barbershop";
import { useSession } from "@/hooks/use-session";

const PricingCards = lazy(() =>
  import("@/components/pricing/pricing-cards").then((module) => ({
    default: module.PricingCards,
  })),
);

const ExtraCreditsCards = lazy(() =>
  import("@/components/profile/extra-credits-cards").then((module) => ({
    default: module.ExtraCreditsCards,
  })),
);

export const PlansTab: FC = () => {
  const { data: session } = useSession();
  const { data: barbershop } = useBarbershopByOwnerId(session?.id ?? "");

  return (
    <div className="space-y-8">
      <PricingCards />

      <Separator />

      {barbershop && (
        <Suspense fallback={<Skeleton className="h-115 w-full rounded-xl" />}>
          <ExtraCreditsCards barbershopId={barbershop._id} />
        </Suspense>
      )}
    </div>
  );
};
