import {
  BuildingsIcon,
  ImagesIcon,
  MapPinIcon,
  SquaresFourIcon,
  StorefrontIcon,
} from "@phosphor-icons/react";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { z } from "zod";
import type { BarbershopRatingFilters } from "@/components/barbershops/barbershop-filters";
import { EMPTY_RATING_FILTERS } from "@/components/barbershops/barbershop-filters";
import type { BarbershopListView } from "@/components/barbershops/barbershop-grid";
import { BarbershopLoadingGrid } from "@/components/barbershops/barbershop-loading-grid";
import { LocationFirstRun } from "@/components/barbershops/location/location-first-run";
import { LocationProvider } from "@/components/barbershops/location/location-provider";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  activeBarbershopsQueryOptions,
  useActiveBarbershops,
} from "@/hooks/barbershop/use-barbershop";
import { useSession } from "@/hooks/use-session";
import type { BarbershopSort } from "@/lib/barbershop-sort";
import {
  BARBERSHOP_SORTS,
  DEFAULT_BARBERSHOP_SORT,
} from "@/lib/barbershop-sort";
import { breadcrumbStructuredData, getCanonicalUrl, seo } from "@/lib/utils";
import { useLocationStore } from "@/store/barbershop-filters";

const BarbershopFilters = lazy(() =>
  import("@/components/barbershops/barbershop-filters").then((module) => ({
    default: module.BarbershopFilters,
  })),
);
const BarbershopFiltersDrawer = lazy(() =>
  import("@/components/barbershops/barbershop-filters").then((module) => ({
    default: module.BarbershopFiltersDrawer,
  })),
);
const BarbershopSortSelect = lazy(() =>
  import("@/components/barbershops/barbershop-filters").then((module) => ({
    default: module.BarbershopSortSelect,
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
  rating?: number;
  reviews?: number;
  sort?: BarbershopSort;
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
  rating: z.number().min(0).max(5).optional().catch(undefined),
  reviews: z.number().int().min(0).optional().catch(undefined),
  sort: z.enum(BARBERSHOP_SORTS).optional().catch(undefined),
});

export const Route = createFileRoute("/barbershops/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({
    ...toCompleteLocation(search),
    rating: search.rating,
    reviews: search.reviews,
    sort: search.sort,
  }),
  ssr: "data-only",
  loader: async (opts) => {
    // `getActive` is bounded by the city+state index, so there is nothing to
    // fetch until the visitor has picked a location — the page renders the
    // location picker instead.
    if (!opts.deps.city || !opts.deps.state) return;

    // Primary content: the grid blocks on the barbershop list. Every filter is
    // part of the query args, so each combination gets its own Convex cache
    // entry and toggling filters back resolves from cache with no delay.
    await opts.context.queryClient.ensureQueryData(
      activeBarbershopsQueryOptions({
        city: opts.deps.city,
        state: opts.deps.state,
        userId: opts.context.userId ?? undefined,
        minRating: opts.deps.rating,
        minReviews: opts.deps.reviews,
        sortBy: opts.deps.sort,
      }),
    );
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

interface BarbershopResultsProps {
  city: string;
  state: string;
  filters: BarbershopRatingFilters;
  onFiltersChange: (filters: BarbershopRatingFilters) => void;
  sort: BarbershopSort;
  onSortChange: (sort: BarbershopSort) => void;
  view: BarbershopListView;
}

/**
 * Result list for a chosen city. Split out of the page so the suspending
 * `useActiveBarbershops` call only ever mounts with a complete location —
 * `getActive` requires city + state to stay bounded by its index.
 */
function BarbershopResults({
  city,
  state,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  view,
}: BarbershopResultsProps) {
  const { data: user } = useSession();

  const { data: barbershops } = useActiveBarbershops({
    city,
    state,
    userId: user?.id ?? undefined,
    minRating: filters.minRating > 0 ? filters.minRating : undefined,
    minReviews: filters.minReviews > 0 ? filters.minReviews : undefined,
    sortBy: sort,
  });

  const hasRatingFilters = filters.minRating > 0 || filters.minReviews > 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm tabular-nums">
          {barbershops.length}{" "}
          {barbershops.length === 1 ? "barbería" : "barberías"}
        </p>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Ordenar por</span>
          <Suspense fallback={<Skeleton className="h-9 w-44" />}>
            <BarbershopSortSelect onValueChange={onSortChange} value={sort} />
          </Suspense>
        </div>
      </div>

      <BarbershopGrid barbershops={barbershops} view={view} />

      {hasRatingFilters && barbershops.length < 1 && (
        <Empty className="bg-accent/20 dark:bg-accent/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StorefrontIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>No hay barberías con esos filtros.</EmptyTitle>
            <EmptyDescription>
              Limpia los filtros para ver todas las barberías de {city}.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              onClick={() => onFiltersChange(EMPTY_RATING_FILTERS)}
              variant="outline"
            >
              Limpiar filtros
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {!hasRatingFilters && barbershops.length < 1 && (
        <Empty className="bg-accent/20 dark:bg-accent/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BuildingsIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle>Todavía no hay barberías en {city}.</EmptyTitle>
            <EmptyDescription>
              Prueba con otra ciudad o vuelve pronto: estamos creciendo.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  );
}

function BarbershopsPage() {
  const search = useSearch({ from: "/barbershops/" });
  const navigate = useNavigate({ from: "/barbershops/" });
  const completeLocation = toCompleteLocation(search);

  const [view, setView] = useState<BarbershopListView>("gallery");

  // URL search params are the filter state; navigation (replace, no scroll
  // reset) is the only setter so links stay shareable and back/forward works.
  const filters: BarbershopRatingFilters = {
    minRating: search.rating ?? 0,
    minReviews: search.reviews ?? 0,
  };

  const setFilters = (next: BarbershopRatingFilters) =>
    navigate({
      search: (prev) => ({
        ...prev,
        rating: next.minRating > 0 ? next.minRating : undefined,
        reviews: next.minReviews > 0 ? next.minReviews : undefined,
      }),
      replace: true,
      resetScroll: false,
    });

  const setSort = (next: BarbershopSort) =>
    navigate({
      search: (prev) => ({
        ...prev,
        sort: next === DEFAULT_BARBERSHOP_SORT ? undefined : next,
      }),
      replace: true,
      resetScroll: false,
    });

  return (
    <BorderContainer>
      <LocationProvider>
        <header className="flex flex-wrap items-end justify-between gap-4 pt-4">
          <div className="space-y-1">
            <h1
              className="font-semibold text-2xl tracking-tight md:text-3xl"
              style={{
                viewTransitionName: "barbershops",
              }}
            >
              Barberías
            </h1>
            <p className="text-pretty text-muted-foreground text-sm">
              Encuentra una barbería cerca de ti y reserva tu próxima cita.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <Suspense fallback={<Skeleton className="h-9 w-24" />}>
                <BarbershopFiltersDrawer filters={filters} />
              </Suspense>
            </div>

            <TooltipProvider>
              <fieldset
                aria-label="Vista de resultados"
                className="flex items-center gap-0.5 rounded-lg border bg-background p-0.5"
              >
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label="Vista de galería"
                        aria-pressed={view === "gallery"}
                        onClick={() => setView("gallery")}
                        size="icon"
                        variant={view === "gallery" ? "secondary" : "ghost"}
                      >
                        <ImagesIcon />
                      </Button>
                    }
                  />
                  <TooltipContent>Vista de galería</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label="Vista de cuadrícula"
                        aria-pressed={view === "grid"}
                        onClick={() => setView("grid")}
                        size="icon"
                        variant={view === "grid" ? "secondary" : "ghost"}
                      >
                        <SquaresFourIcon />
                      </Button>
                    }
                  />
                  <TooltipContent>Vista de cuadrícula</TooltipContent>
                </Tooltip>
              </fieldset>
            </TooltipProvider>
          </div>
        </header>

        <LocationFirstRun />

        <div className="hidden md:block">
          <Suspense fallback={<Skeleton className="h-9 w-full max-w-3xl" />}>
            <BarbershopFilters filters={filters} onFiltersChange={setFilters} />
          </Suspense>
        </div>

        {completeLocation.city && completeLocation.state ? (
          <Suspense fallback={<BarbershopLoadingGrid />}>
            <BarbershopResults
              city={completeLocation.city}
              filters={filters}
              onFiltersChange={setFilters}
              onSortChange={setSort}
              sort={search.sort ?? DEFAULT_BARBERSHOP_SORT}
              state={completeLocation.state}
              view={view}
            />
          </Suspense>
        ) : (
          <Empty className="bg-accent/20 dark:bg-accent/20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPinIcon className="size-6" />
              </EmptyMedia>
              <EmptyTitle>Elige tu ciudad para empezar.</EmptyTitle>
              <EmptyDescription>
                Mostramos las barberías de una ciudad a la vez. Usa tu ubicación
                o elige departamento y ciudad arriba.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </LocationProvider>
    </BorderContainer>
  );
}
