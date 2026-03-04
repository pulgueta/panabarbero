import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import {
  getPricingPlansQueryOptions,
  getSubscriptionQueryOptions,
} from "@/hooks/billing/use-pricing";
import { getSessionQueryOptions } from "@/hooks/use-session";

const PricingCards = lazy(() =>
  import("@/components/pricing/pricing-cards").then((module) => ({
    default: module.PricingCards,
  })),
);

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  pendingComponent: LoadingComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getSessionQueryOptions());

    await Promise.all([
      context.queryClient.ensureQueryData(getPricingPlansQueryOptions()),
      context.queryClient.ensureQueryData(getSubscriptionQueryOptions()),
    ]);
  },
  wrapInSuspense: true,
  ssr: "data-only",
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

      <Suspense fallback={<ProfileTabSkeleton />}>
        <PricingCards />
      </Suspense>
    </BorderContainer>
  );
}
