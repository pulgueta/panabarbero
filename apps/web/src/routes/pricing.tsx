import { createFileRoute } from "@tanstack/react-router";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { getPricingPlansQueryOptions } from "@/hooks/billing/use-pricing";
import { getSessionQueryOptions } from "@/hooks/use-session";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  pendingComponent: LoadingComponent,
  loader: async (opts) => {
    await Promise.all([
      opts.context.queryClient.ensureQueryData(getPricingPlansQueryOptions()),
      opts.context.queryClient.ensureQueryData(getSessionQueryOptions()),
    ]);
  },
});

function PricingPage() {
  return (
    <BorderContainer className="space-y-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-balance font-bold text-3xl tracking-tight md:text-4xl">
          Haz crecer tu barbería
        </h1>
        <p className="max-w-prose text-pretty text-center text-muted-foreground">
          Elige el plan que mejor se adapte a tu operación. Puedes cambiarlo en
          cualquier momento.
        </p>
      </header>

      <PricingCards />
    </BorderContainer>
  );
}
