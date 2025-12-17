import { tanstack } from "@panabarbero/constants";
import { createFileRoute } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { Activity, Suspense } from "react";

import { BarbershopFilters } from "@/components/barbershops/barbershop-filters";
import { BarbershopGrid } from "@/components/barbershops/barbershop-grid";
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
import {
  activeBarbershopsQueryOptions,
  useActiveBarbershops,
} from "@/hooks/barbershop/use-barbershop";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

export type BarbershopSearch = {
  city?: string;
  state?: string;
};

export const Route = createFileRoute("/barbershops/")({
  validateSearch: (search?: BarbershopSearch | undefined) => {
    return {
      city: search?.city ?? undefined,
      state: search?.state ?? undefined,
    };
  },
  loaderDeps: ({ search }) => ({
    city: search?.city ?? undefined,
    state: search?.state ?? undefined,
  }),
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
});

function BarbershopsPage() {
  const search = Route.useSearch();

  const { data: user } = useSession();

  const [storedState] = useLocalStorage<string>(
    tanstack.localStorageKeys.barbershopsState,
  );
  const [storedCity] = useLocalStorage<string>(
    tanstack.localStorageKeys.barbershopsCity,
  );

  const city = storedCity ?? search.city;
  const state = storedState ?? search.state;

  const {
    data: barbershops,
    isLoading,
    isRefetching,
  } = useActiveBarbershops({ city, state, userId: user?.userId ?? undefined });

  const showModal = !city && !state;

  return (
    <BorderContainer className="p-0 md:p-0 lg:p-0">
      <header className="flex flex-col items-center justify-between gap-2.5 py-6 md:py-10">
        <section className="w-full space-y-4">
          <h1
            className="text-balance text-center font-bold text-3xl tracking-tight"
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

      <div className="w-full border-y bg-accent/20 px-4 py-6">
        <BarbershopFilters />
      </div>

      <Activity mode={showModal ? "visible" : "hidden"}>
        <LocationGate />
      </Activity>

      <Suspense fallback={<BarbershopLoadingGrid />}>
        <Activity
          mode={
            isLoading || isRefetching || barbershops.length < 1
              ? "hidden"
              : "visible"
          }
        >
          <BarbershopGrid barbershops={barbershops} />
        </Activity>
      </Suspense>

      {barbershops.length < 1 && (
        <Empty className="bg-accent/20 dark:bg-accent/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No hay barberías disponibles.</EmptyTitle>
            <EmptyDescription>
              Cuando se agregue una barbería, podrás verla aquí.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </BorderContainer>
  );
}
