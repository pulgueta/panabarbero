import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { BarbershopFilters } from "@/components/barbershops/barbershop-filters";
import { BarbershopGrid } from "@/components/barbershops/barbershop-grid";
import { LocationGate } from "@/components/barbershops/location-gate";
import { Input } from "@/components/ui/input";
import { activeBarbershopsQueryOptions } from "@/hooks/use-barbershop";

export type BarbershopSearch = {
  city?: string;
  state?: string;
};

export const Route = createFileRoute("/barbershops/")({
  validateSearch: (search: BarbershopSearch) => {
    return {
      city: search.city,
      state: search.state,
    };
  },
  component: BarbershopsPage,
  loader: async (opts) => {
    const search = opts.location.search;

    await opts.context.queryClient.ensureQueryData(
      activeBarbershopsQueryOptions(search),
    );
  },
});

function BarbershopsPage() {
  const { city, state } = Route.useSearch();

  const fromLocalStorage = {
    city: localStorage.getItem("pb_city"),
    state: localStorage.getItem("pb_state"),
  };

  const showModal =
    (!fromLocalStorage.city || !fromLocalStorage.state) && (!city || !state);

  const searchCity = fromLocalStorage.city ?? city;
  const searchState = fromLocalStorage.state ?? state;

  return (
    <div className="container mx-auto min-h-[calc(100dvh-65px)] border-x">
      <header className="flex flex-col items-center justify-between gap-2.5 border-b py-12 md:py-16">
        <section className="mx-auto w-full max-w-xl space-y-4">
          <h1 className="text-balance text-center font-bold text-3xl tracking-tight">
            ¿Qué estilo buscas hoy?
          </h1>

          <div className="relative mx-auto w-full px-4">
            <Search className="absolute top-2.5 left-7 size-4 text-muted-foreground" />
            <Input
              placeholder="Corte y barba..."
              className="pl-9"
              role="search"
            />
          </div>
        </section>
      </header>

      <div className="relative mx-auto w-full max-w-xl p-4">
        <BarbershopFilters />
      </div>
      {showModal ? (
        <LocationGate />
      ) : (
        <BarbershopGrid city={searchCity} state={searchState} />
      )}
    </div>
  );
}
