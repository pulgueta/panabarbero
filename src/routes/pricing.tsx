import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import {
  getPricingPlansQueryOptions,
  getSubscriptionQueryOptions,
} from "@/hooks/billing/use-pricing";
import { getCanonicalUrl, seo } from "@/lib/utils";

const PricingCards = lazy(() =>
  import("@/components/pricing/pricing-cards").then((module) => ({
    default: module.PricingCards,
  })),
);

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  pendingComponent: LoadingComponent,
  ssr: "data-only",
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(getPricingPlansQueryOptions()),
      context.queryClient.ensureQueryData(getSubscriptionQueryOptions()),
    ]);
  },
  head: () => ({
    meta: seo({
      title: "Planes de PanaBarbero - Precios y características",
      description:
        "Descubre nuestros planes flexibles para barberías. Plan Gratuito, Pro y Premium con todas las herramientas que necesitas.",
      canonical: getCanonicalUrl("/pricing"),
    }),
    links: [{ rel: "canonical", href: getCanonicalUrl("/pricing") }],
  }),
  wrapInSuspense: true,
});

function PricingPage() {
  return (
    <BorderContainer>
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-balance font-semibold text-3xl tracking-tight md:text-4xl">
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
