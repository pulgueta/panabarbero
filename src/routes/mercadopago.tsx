import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { getSessionQueryOptions } from "@/hooks/use-session";
import { getCanonicalUrl, seo } from "@/lib/utils";

const MercadopagoPricing = lazy(() =>
  import("@/components/mercadopago/mercadopago-pricing").then((module) => ({
    default: module.MercadopagoPricing,
  })),
);

export const Route = createFileRoute("/mercadopago")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: typeof search.status === "string" ? search.status : undefined,
  }),
  component: MercadopagoPage,
  pendingComponent: LoadingComponent,
  ssr: "data-only",
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getSessionQueryOptions());
  },
  head: () => ({
    meta: seo({
      title: "Suscripciones MercadoPago (prueba) - PanaBarbero",
      description:
        "Superficie de prueba para las suscripciones con MercadoPago, en paralelo a Polar.",
      canonical: getCanonicalUrl("/mercadopago"),
    }),
    links: [{ rel: "canonical", href: getCanonicalUrl("/mercadopago") }],
  }),
  wrapInSuspense: true,
});

function MercadopagoPage() {
  const { status } = Route.useSearch();

  return (
    <BorderContainer>
      <header className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-balance font-semibold text-3xl tracking-tight md:text-4xl">
          Suscripciones con MercadoPago
        </h1>
        <p className="max-w-prose text-pretty text-center text-muted-foreground">
          Integración de prueba en paralelo a Polar. Elige un plan para iniciar
          el checkout de MercadoPago.
        </p>
      </header>

      <Suspense fallback={<ProfileTabSkeleton />}>
        <MercadopagoPricing statusParam={status} />
      </Suspense>
    </BorderContainer>
  );
}
