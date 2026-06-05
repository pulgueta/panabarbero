import { BuildingsIcon } from "@phosphor-icons/react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";

import { BarbershopLoadingGrid } from "@/components/barbershops/barbershop-loading-grid";
import { LocationFirstRun } from "@/components/barbershops/location/location-first-run";
import { LocationProvider } from "@/components/barbershops/location/location-provider";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  activeBarbershopsQueryOptions,
  useActiveBarbershops,
} from "@/hooks/barbershop/use-barbershop";
import { barbershopMetadataQueryOptions } from "@/hooks/barbershop/use-barbershop-metadata";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";
import { breadcrumbStructuredData, getCanonicalUrl, seo } from "@/lib/utils";
import { useLocationStore } from "@/store/barbershop-filters";

const BarbershopFilters = lazy(() =>
  import("@/components/barbershops/barbershop-filters").then((module) => ({
    default: module.BarbershopFilters,
  })),
);
const BarbershopGrid = lazy(() =>
  import("@/components/barbershops/barbershop-grid").then((module) => ({
    default: module.BarbershopGrid,
  })),
);

export type BarbershopSearch = {
  city?: string;
  state?: string;
};

const toCompleteLocation = (location?: BarbershopSearch) => {
  if (!location?.city || !location?.state) {
    return { city: undefined, state: undefined };
  }

  return {
    city: location.city,
    state: location.state,
  };
};

const searchSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
});

export const Route = createFileRoute("/barbershops/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => toCompleteLocation(search),
  ssr: "data-only",
  loader: async (opts) => {
    const user = await opts.context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    // Primary content: the grid blocks on the barbershop list.
    const barbershops = await opts.context.queryClient.ensureQueryData(
      activeBarbershopsQueryOptions({
        city: opts.deps.city,
        state: opts.deps.state,
        userId: user?.userId ?? undefined,
      }),
    );

    // Ratings/metadata are decorative (the rating UI is currently commented out
    // in the card), so they must not block the grid. prefetchQuery primes the
    // cache without throwing and without awaiting.
    for (const barbershop of barbershops) {
      void opts.context.queryClient.prefetchQuery(
        barbershopMetadataQueryOptions(barbershop._id),
      );
    }
  },
  head: () => {
    const persisted = useLocationStore.getState();

    const city = persisted.city;
    const state = persisted.state;

    const location = city && state ? `en ${city}, ${state}` : "";

    return {
      meta: seo({
        title: `Barberías ${location} - PanaBarbero`,
        description: `Descubre barberías ${location} en PanaBarbero. Reserva citas con tus barberos de confianza.`,
        canonical: getCanonicalUrl("/barbershops"),
      }),
      links: [{ rel: "canonical", href: getCanonicalUrl("/barbershops") }],
      scripts: [
        breadcrumbStructuredData([
          { name: "Inicio", url: getCanonicalUrl("/") },
          { name: "Barberías", url: getCanonicalUrl("/barbershops") },
        ]),
      ],
    };
  },
  component: BarbershopsPage,
  pendingComponent: LoadingComponent,
});

function BarbershopsPage() {
  const { data: user } = useSession();
  const search = useSearch({ from: "/barbershops/" });
  const completeLocation = toCompleteLocation(search);

  const { data: barbershops } = useActiveBarbershops({
    city: completeLocation.city,
    state: completeLocation.state,
    userId: user?.userId ?? undefined,
  });

  const hasLocation = !!(search.city && search.state);

  return (
    <BorderContainer>
      <LocationProvider>
        <header className="flex flex-col items-center justify-between gap-2.5 pt-4 pb-2">
          <section className="w-full space-y-4">
            <h1
              className="text-balance text-center font-semibold text-2xl tracking-tight md:text-3xl"
              style={{
                viewTransitionName: "barbershops",
              }}
            >
              Encuentra barberías cerca de ti
            </h1>
          </section>
        </header>

        <LocationFirstRun />

        <Suspense
          fallback={<Skeleton className="mx-auto h-14 w-full max-w-3xl" />}
        >
          <div className="mx-auto w-full max-w-3xl rounded-xl border bg-accent/20 p-4">
            <BarbershopFilters />
          </div>
        </Suspense>

        <Suspense fallback={<BarbershopLoadingGrid />}>
          <BarbershopGrid barbershops={barbershops} />

          {hasLocation && barbershops.length < 1 && (
            <Empty className="bg-accent/20 dark:bg-accent/20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BuildingsIcon className="size-6" />
                </EmptyMedia>
                <EmptyTitle>No hay barberías disponibles.</EmptyTitle>
                <EmptyDescription>
                  Cuando se agregue una barbería, podrás verla aquí.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </Suspense>
      </LocationProvider>
    </BorderContainer>
  );
}
