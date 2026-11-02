import { ArrowRightIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Hydrate } from "@tanstack/react-start";
import { visible } from "@tanstack/react-start/hydration";
import { lazy, Suspense } from "react";

import { DashboardDemo } from "@/components/landing/dashboard-demo";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import { FREE_MAX_BARBERS, HOME_FAQS } from "@/config/home-faqs";
import {
  breadcrumbStructuredData,
  faqStructuredData,
  getCanonicalUrl,
  seo,
  softwareApplicationStructuredData,
} from "@/lib/utils";
import { useLocationStore } from "@/store/barbershop-filters";

const ModuleSections = lazy(() =>
  import("@/components/landing/module-sections").then((module) => ({
    default: module.ModuleSections,
  })),
);

const MetricsSection = lazy(() =>
  import("@/components/landing/metrics-section").then((module) => ({
    default: module.MetricsSection,
  })),
);

const StepsSection = lazy(() =>
  import("@/components/landing/steps-section").then((module) => ({
    default: module.StepsSection,
  })),
);

const FaqSection = lazy(() =>
  import("@/components/landing/faq-section").then((module) => ({
    default: module.FaqSection,
  })),
);

const CtaSection = lazy(() =>
  import("@/components/landing/cta-section").then((module) => ({
    default: module.CtaSection,
  })),
);

const LandingFooter = lazy(() =>
  import("@/components/landing/footer").then((module) => ({
    default: module.LandingFooter,
  })),
);

const PricingCards = lazy(() =>
  import("@/components/pricing/pricing-cards").then((module) => ({
    default: module.PricingCards,
  })),
);

export const Route = createFileRoute("/")({
  pendingComponent: LoadingComponent,
  component: RouteComponent,
  ssr: true,
  staleTime: cacheTime.extreme,
  gcTime: cacheTime.extreme,
  loader: async ({ context }) => {
    if (context.userId) {
      throw redirect({
        to: "/profile",
        search: { tab: "account" },
        replace: true,
      });
    }
  },
  head: () => ({
    meta: [
      ...seo({
        title: "PanaBarbero - Descubre barberías y reserva citas",
        description:
          "Encuentra y reserva citas en barberías de Colombia. Gestiona tu barbería, barberos, servicios y citas con PanaBarbero. Gratis para independientes.",
        canonical: getCanonicalUrl("/"),
      }),
      {
        name: "keywords",
        content:
          "barberías Colombia, reservar cita barbería, gestión barbería, app barbería, PanaBarbero, citas barbero online, barberos Colombia",
      },
      { name: "robots", content: "index, follow" },
      {
        name: "og:image:alt",
        content: "PanaBarbero - La solución para barberías en Colombia",
      },
    ],
    links: [{ rel: "canonical", href: getCanonicalUrl("/") }],
    scripts: [
      softwareApplicationStructuredData(),
      faqStructuredData(HOME_FAQS),
      breadcrumbStructuredData([{ name: "Inicio", url: getCanonicalUrl("/") }]),
    ],
  }),
  headers: () => ({
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  }),
});

function RouteComponent() {
  const persistedState = useLocationStore((s) => s.state);
  const persistedCity = useLocationStore((s) => s.city);

  return (
    <BorderContainer>
      <main>
        <section className="flex flex-col items-center gap-5 py-12 text-center md:py-16">
          <h1 className="max-w-3xl text-balance font-semibold text-4xl tracking-tighter md:text-5xl lg:text-6xl">
            Tu barbería organizada. Tu agenda llena.
          </h1>
          <p className="max-w-xl text-pretty text-muted-foreground md:text-lg">
            Así se ve una barbería funcionando en PanaBarbero: las citas entran
            solas, el stock se cuenta solo y tú solo confirmas de vez en cuando.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="lg"
              render={<Link to="/login" />}
              nativeButton={false}
            >
              Registrar mi barbería
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={
                <Link
                  to="/barbershops"
                  search={{ city: persistedCity, state: persistedState }}
                />
              }
              nativeButton={false}
            >
              Buscar barberías
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            Gratis hasta {FREE_MAX_BARBERS} barberos. Sin tarjeta de crédito.
          </p>
        </section>

        <DashboardDemo />

        <Separator className="my-12" />

        <Suspense>
          <ModuleSections />
        </Suspense>

        <Separator className="my-12" />

        <Hydrate
          when={visible({ rootMargin: "200px" })}
          fallback={<Skeleton className="h-96 w-full rounded-xl" />}
        >
          <MetricsSection />
        </Hydrate>

        <Separator className="my-12" />

        <Suspense>
          <StepsSection />
        </Suspense>

        <Separator className="my-12" />

        <section className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-balance text-center font-semibold text-3xl tracking-tighter md:text-4xl">
              Precios
            </h2>
            <p className="text-pretty text-center text-muted-foreground">
              Empieza gratis y crece cuando tu barbería crezca.
            </p>
          </div>

          <Hydrate
            when={visible({ rootMargin: "200px" })}
            fallback={<ProfileTabSkeleton />}
          >
            <PricingCards />
          </Hydrate>

          <div className="flex justify-center">
            <Button
              variant="ghost"
              render={<Link to="/pricing" />}
              nativeButton={false}
            >
              Ver comparación completa
              <ArrowRightIcon weight="bold" className="size-4" />
            </Button>
          </div>
        </section>

        <Separator className="my-12" />

        <Suspense>
          <FaqSection />
        </Suspense>

        <Separator className="my-12" />

        <Hydrate when={visible({ rootMargin: "200px" })}>
          <CtaSection />
        </Hydrate>
      </main>

      <Suspense>
        <LandingFooter />
      </Suspense>
    </BorderContainer>
  );
}
