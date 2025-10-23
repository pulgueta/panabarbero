import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";

import { BarbershopListCard } from "@/components/barbershops/barbershop-list-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSearchBarbershopsByName,
  useUserVisitedBarbershops,
} from "@/hooks/use-barbershop";
import { useDebounce } from "@/hooks/use-debounce";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/appointments/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { data: user } = useSession();

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const { data: barbershops } = useUserVisitedBarbershops(user?.user.id ?? "");
  const {
    data: searchResults,
    isLoading: isSearching,
    isRefetching: isSearchingAgain,
  } = useSearchBarbershopsByName(debouncedSearchQuery);

  return (
    <div className="container mx-auto flex min-h-[calc(100dvh-65px)] flex-col items-start justify-start gap-8 border-x p-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-xl">Agendamiento rápido:</h1>
        {user ? (
          barbershops && barbershops.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {barbershops.map((barbershop) => (
                <BarbershopListCard
                  key={barbershop?._id}
                  // biome-ignore lint/style/noNonNullAssertion: can be null
                  barbershop={barbershop!}
                />
              ))}
            </div>
          ) : (
            <p className="text-pretty text-muted-foreground text-sm">
              No has visitado ninguna barbería
            </p>
          )
        ) : (
          <p className="text-pretty text-muted-foreground text-sm">
            <Link
              to="/login"
              className="underline underline-offset-4"
              style={{ viewTransitionName: "login" }}
            >
              Inicia sesión
            </Link>{" "}
            para ver tus barberías más recientes aquí.
          </p>
        )}
      </div>

      <div className="flex w-full flex-col gap-2">
        <h1 className="font-bold text-xl">Buscar barbería:</h1>
        <div className="relative mb-4 w-full">
          <Search className="absolute top-2.5 left-2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar barbería por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            role="search"
            className="w-full bg-background pl-8 focus-visible:ring-0 md:max-w-xl"
          />
        </div>

        {(isSearching || isSearchingAgain) && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: key is not needed for skeleton
              <Skeleton key={index} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        )}

        {searchResults && searchResults.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {searchResults.map((barbershop) => (
              <BarbershopListCard
                key={barbershop?._id}
                barbershop={barbershop}
              />
            ))}
          </div>
        ) : (
          debouncedSearchQuery.length > 0 && (
            <p className="text-pretty text-muted-foreground text-sm">
              No se encontraron barberías con ese nombre.
            </p>
          )
        )}
      </div>
    </div>
  );
}
