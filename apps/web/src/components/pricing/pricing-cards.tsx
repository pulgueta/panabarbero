import type { FC } from "react";

import { useConfiguredProducts } from "@/hooks/billing/use-pricing";
import { useSession } from "@/hooks/use-session";
import { PricingCard } from "./pricing-card";

export const PricingCards: FC = () => {
  const { data: products } = useConfiguredProducts();
  const { data: session } = useSession();

  // Explicit tier order (premium → pro → free), paired by stable product key —
  // a product rename in the Polar dashboard cannot break the pairing.
  const tiers = [
    {
      product: products.barberiaProfMonthly,
      yearlyProduct: products.barberiaProfYearly,
    },
    {
      product: products.barberiaMonthly,
      yearlyProduct: products.barberiaYearly,
    },
    { product: products.independiente },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tiers.map(({ product, yearlyProduct }) =>
        product ? (
          <PricingCard
            key={product.id}
            product={product}
            yearlyProduct={yearlyProduct ?? undefined}
            userId={session?.id ?? undefined}
          />
        ) : null,
      )}
    </div>
  );
};
