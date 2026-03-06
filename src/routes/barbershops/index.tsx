import { BuildingsIcon } from "@phosphor-icons/react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { BarbershopLoadingGrid } from "@/components/barbershops/barbershop-loading-grid";
import { LocationGate } from "@/components/barbershops/location-gate";
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
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";
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

export const Route = createFileRoute("/barbershops/")({
  validateSearch: (search?: BarbershopSearch | undefined) => {
    // Fall back to the persisted store values when URL params are absent
    // so the loader always gets a complete location on return visits.
    const persisted = useLocationStore.getState();
    return {
      city: search?.city ?? persisted.city,
      state: search?.state ?? persisted.state,
    };
  },
  loaderDeps: ({ search }) => toCompleteLocation(search),
  loader: async (opts) => {
    const user = await opts.context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    await opts.context.queryClient.ensureQueryData(
      activeBarbershopsQueryOptions({
        city: opts.deps.city,
        state: opts.deps.state,
        userId: user?.userId ?? undefined,
      }),
    );
  },
  component: BarbershopsPage,
  pendingComponent: LoadingComponent,
  ssr: false,
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
  const showModal = !search.city && !search.state;

  return (
    <BorderContainer className="space-y-6">
      <header className="flex flex-col items-center justify-between gap-2.5 pt-4 pb-2">
        <section className="w-full space-y-4">
          <h1
            className="text-balance text-center font-bold text-2xl tracking-tight md:text-3xl"
            style={{
              viewTransitionName: "barbershops",
            }}
          >
            Encuentra barberías cerca de ti
          </h1>

          {/* <div className="mx-auto w-full px-4">
            <InputGroup>
              <InputGroupInput placeholder="Corte y barba..." role="search" />
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
            </InputGroup>
          </div> */}
        </section>
      </header>

      <Suspense
        fallback={<Skeleton className="mx-auto h-14 w-full max-w-3xl" />}
      >
        <div className="mx-auto w-full max-w-3xl rounded-xl border bg-accent/20 p-4">
          <BarbershopFilters />
        </div>
      </Suspense>

      {showModal && <LocationGate />}

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
    </BorderContainer>
  );
}
