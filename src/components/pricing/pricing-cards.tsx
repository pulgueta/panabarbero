import type { FC } from "react";

import { usePricingPlans } from "@/hooks/billing/use-pricing";
import { useSession } from "@/hooks/use-session";
import { PricingCard } from "./pricing-card";

interface PricingCardsProps {
  metadata?: Record<string, string>;
}

export const PricingCards: FC<PricingCardsProps> = ({ metadata }) => {
  const { data: products } = usePricingPlans();
  const { data: session } = useSession();

  const monthlyProducts = products.filter(
    (product) => product.recurringInterval === "month",
  );

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {monthlyProducts.map((product) => {
        return (
          <PricingCard
            key={product.id}
            product={product}
            userId={session?.id ?? undefined}
            products={products}
            metadata={metadata}
          />
        );
      })}
    </div>
  );
};
