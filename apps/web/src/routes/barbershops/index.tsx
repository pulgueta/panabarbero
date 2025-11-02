import { tanstack } from "@panabarbero/constants";
import { createFileRoute } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { BarbershopFilters } from "@/components/barbershops/barbershop-filters";
import { BarbershopGrid } from "@/components/barbershops/barbershop-grid";
import { LocationGate } from "@/components/barbershops/location-gate";
import { LoadingComponent } from "@/components/layout/loading-component";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { activeBarbershopsQueryOptions } from "@/hooks/use-barbershop";
import { useLocalStorage } from "@/hooks/use-local-storage";

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
    await opts.context.queryClient.prefetchQuery(
      activeBarbershopsQueryOptions({
        city: opts.deps.city,
        state: opts.deps.state,
      }),
    );
  },
  component: BarbershopsPage,
  pendingComponent: LoadingComponent,
});

function BarbershopsPage() {
  const search = Route.useSearch();

  const [storedState] = useLocalStorage<string>(
    tanstack.localStorageKeys.barbershopsState,
  );
  const [storedCity] = useLocalStorage<string>(
    tanstack.localStorageKeys.barbershopsCity,
  );

  const city = storedCity ?? search.city;
  const state = storedState ?? search.state;

  const [filters, setFilters] = useState<BarbershopSearch>({
    city,
    state,
  });

  const showModal = !city && !state;

  useEffect(() => {
    if (search.city || search.state) {
      setFilters({
        city: search.city,
        state: search.state,
      });
    }
  }, [search.city, search.state]);

  return (
    <div className="container mx-auto min-h-dvh border-x pb-32 md:min-h-[calc(100dvh-65px)] md:pb-0">
      <header className="flex flex-col items-center justify-between gap-2.5 py-12 md:py-16">
        <section className="mx-auto w-full max-w-xl space-y-4">
          <h1 className="text-balance text-center font-bold text-3xl tracking-tight">
            ¿Qué estilo buscas hoy?
          </h1>

          <div className="mx-auto w-full px-4">
            <InputGroup>
              <InputGroupInput placeholder="Corte y barba..." role="search" />
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
            </InputGroup>
          </div>
        </section>
      </header>

      <div className="relative mx-auto w-full border-y bg-accent/20 px-4 py-6 dark:bg-accent/20">
        <BarbershopFilters />
      </div>
      {showModal ? <LocationGate /> : <BarbershopGrid filters={filters} />}
    </div>
  );
}
