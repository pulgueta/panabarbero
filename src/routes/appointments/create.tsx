import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  searchBarbershopsByNameQueryOptions,
  useSearchBarbershopsByName,
} from "@/hooks/barbershop/use-barbershop";
import {
  userVisitedBarbershopsQueryOptions,
  useVisitedBarbershops,
} from "@/hooks/use-appointments";
import { useDebounce } from "@/hooks/use-debounce";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";
import { getCanonicalUrl, seo } from "@/lib/utils";

const BarbershopListCard = lazy(() =>
  import("@/components/barbershops/barbershop-list-card").then((module) => ({
    default: module.BarbershopListCard,
  })),
);

export const Route = createFileRoute("/appointments/create")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  head: () => ({
    meta: seo({
      title: "Agendar Cita - PanaBarbero",
      description:
        "Busca y agenda citas con las mejores barberías cerca de ti. Reserva tu turno ahora mismo.",
      canonical: getCanonicalUrl("/appointments/create"),
    }),
    links: [
      { rel: "canonical", href: getCanonicalUrl("/appointments/create") },
    ],
  }),
  loader: async (ctx) => {
    const user = await ctx.context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      await Promise.all([
        ctx.context.queryClient.ensureQueryData(
          userVisitedBarbershopsQueryOptions(user.userId),
        ),
      ]);
    }

    await ctx.context.queryClient.ensureQueryData(
      searchBarbershopsByNameQueryOptions(),
    );
  },
  ssr: false,
});

function RouteComponent() {
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [debouncedSearchQuery] = useDebounce(searchQuery, 500);

  const { data: user } = useSession();

  const { data: barbershops } = useVisitedBarbershops(
    user?.userId ?? undefined,
  );
  const { data: searchResults } =
    useSearchBarbershopsByName(debouncedSearchQuery);

  return (
    <BorderContainer>
      <div className="flex flex-col gap-2">
        <h1
          className="text-balance font-bold text-xl tracking-tight"
          style={{
            viewTransitionName: "barbershops",
          }}
        >
          Agendamiento rápido:
        </h1>

        {user ? (
          barbershops.length ? (
            <Suspense fallback={<ProfileTabSkeleton />}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {barbershops.map((barbershop) => (
                  <BarbershopListCard
                    key={barbershop?._id}
                    // biome-ignore lint/style/noNonNullAssertion: won't be null
                    barbershop={barbershop!}
                    showAddress={false}
                  />
                ))}
              </div>
            </Suspense>
          ) : (
            <p
              className="text-pretty text-muted-foreground text-sm"
              style={{
                viewTransitionName: "barbershops-desc",
              }}
            >
              No has visitado ninguna barbería
            </p>
          )
        ) : (
          <p
            className="text-pretty text-muted-foreground text-sm"
            style={{
              viewTransitionName: "barbershops-desc",
            }}
          >
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
              <MagnifyingGlassIcon />
            </InputGroupAddon>
          </InputGroup>
        </div>

        <Suspense fallback={<ProfileTabSkeleton />}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {searchResults.map((barbershop) => (
              <BarbershopListCard
                key={barbershop?._id}
                barbershop={barbershop}
              />
            ))}
          </div>

          {searchResults?.length === 0 && (
            <p className="text-pretty text-muted-foreground text-sm">
              No hay barberías disponibles.
            </p>
          )}
        </Suspense>
      </div>
    </BorderContainer>
  );
}
