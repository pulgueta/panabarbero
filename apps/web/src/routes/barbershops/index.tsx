import { tanstack } from "@panabarbero/constants";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { BarbershopFilters } from "@/components/barbershops/barbershop-filters";
import { BarbershopGrid } from "@/components/barbershops/barbershop-grid";
import { LocationGate } from "@/components/barbershops/location-gate";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Input } from "@/components/ui/input";
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
    await opts.context.queryClient.ensureQueryData(
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
  const [storedState] = useLocalStorage<string | undefined>(
    tanstack.localStorageKeys.barbershopsState,
  );
  const [storedCity] = useLocalStorage<string | undefined>(
    tanstack.localStorageKeys.barbershopsCity,
  );

  const city = storedCity ?? search.city;
  const state = storedState ?? search.state;

  const showModal = !city && !state;

  const filters = {
    city,
    state,
  } satisfies BarbershopSearch;

  return (
    <div className="container mx-auto min-h-screen border-x md:min-h-[calc(100dvh-65px)]">
      <header className="flex flex-col items-center justify-between gap-2.5 border-b py-12 md:py-16 dark:border-b-popover/20">
        <section className="mx-auto w-full max-w-xl space-y-4">
          <h1 className="text-balance text-center font-bold text-3xl tracking-tight">
            ¿Qué estilo buscas hoy?
          </h1>

          <div className="relative mx-auto w-full px-4">
            <Search className="absolute top-2.5 left-7 size-4 text-muted-foreground" />
            <Input
              placeholder="Corte y barba..."
              className="bg-background pl-9"
              role="search"
            />
          </div>
        </section>
      </header>

      <div className="relative mx-auto w-full bg-accent/20 px-4 py-6 dark:bg-accent/20">
        <BarbershopFilters />
      </div>
      {showModal ? <LocationGate /> : <BarbershopGrid filters={filters} />}
    </div>
  );
}
