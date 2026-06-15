import type { FC } from "react";
import { lazy, Suspense } from "react";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useBarbershopByOwnerId } from "@/hooks/barbershop/use-barbershop";
import { usePricingPlans, useSubscription } from "@/hooks/billing/use-pricing";
import { useSession } from "@/hooks/use-session";

const PricingCard = lazy(() =>
  import("@/components/pricing/pricing-card").then((module) => ({
    default: module.PricingCard,
  })),
);

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
  const { data: products } = usePricingPlans();
  const { data: session } = useSession();
  const { data: subscription } = useSubscription();
  const { data: barbershop } = useBarbershopByOwnerId(session?.id ?? "");

  const checkoutMetadata = {
    ...(barbershop?._id ? { barbershopId: barbershop._id } : {}),
    ...(barbershop?.workosOrganizationId
      ? { workosOrganizationId: barbershop.workosOrganizationId }
      : {}),
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        {subscription?.product && (
          <Suspense
            fallback={<Skeleton className="h-full w-full rounded-xl" />}
          >
            <PricingCard
              product={subscription?.product}
              products={products}
              userId={session?.id ?? undefined}
              metadata={checkoutMetadata}
            />
          </Suspense>
        )}

        {barbershop && (
          <Suspense
            fallback={<Skeleton className="h-full w-full rounded-xl" />}
          >
            <ExtraCreditsCards
              barbershopId={barbershop._id}
              workosOrganizationId={barbershop.workosOrganizationId}
            />
          </Suspense>
        )}
      </div>

      <Separator />

      <PricingCards metadata={checkoutMetadata} />
    </div>
  );
};
