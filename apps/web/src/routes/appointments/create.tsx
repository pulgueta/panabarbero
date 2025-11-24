import { createFileRoute, Link } from "@tanstack/react-router";
import { SearchIcon } from "lucide-react";
import { useState } from "react";

import { BarbershopListCard } from "@/components/barbershops/barbershop-list-card";
import { LoadingComponent } from "@/components/layout/loading-component";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSearchBarbershopsByName,
  useUserVisitedBarbershops,
} from "@/hooks/barbershop/use-barbershop";
import { useDebounce } from "@/hooks/use-debounce";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/appointments/create")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
});

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { data: user } = useSession();

  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const { data: barbershops } = useUserVisitedBarbershops(user?.userId ?? "");
  const {
    data: searchResults,
    isLoading: isSearching,
    isRefetching: isSearchingAgain,
  } = useSearchBarbershopsByName(debouncedSearchQuery);

  return (
    <div className="container mx-auto flex min-h-[calc(100dvh-65px)] flex-col items-start justify-start gap-8 border-x px-4 py-8 md:px-8 lg:px-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-balance font-bold text-3xl tracking-tight">
          Agendamiento rápido:
        </h1>
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
        <div className="mb-4 w-full">
          <InputGroup className="w-full max-w-xl">
            <InputGroupInput
              placeholder="Buscar barbería por nombre..."
              role="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
        </div>

        {(isSearching || isSearchingAgain) && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
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
