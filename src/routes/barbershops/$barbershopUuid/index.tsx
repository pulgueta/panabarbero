/** biome-ignore-all lint/style/noNonNullAssertion: objects are guaranteed to be not null */
/** biome-ignore-all lint/suspicious/noNonNullAssertedOptionalChain: objects are guaranteed to be not null */

import { ArrowLeftIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Hydrate } from "@tanstack/react-start";
import { visible } from "@tanstack/react-start/hydration";
import { lazy, Suspense } from "react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ServicesSkeleton } from "@/components/layout/skeleton/services-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { useCarouselApi } from "@/components/ui/carousel";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import {
  barbershopAvailabilityQueryOptions,
  barbershopByUuidQueryOptions,
  useBarbershopByUuid,
} from "@/hooks/barbershop/use-barbershop";
import { barbershopLocationQueryOptions } from "@/hooks/barbershop/use-barbershop-metadata";
import {
  barberByUserIdQueryOptions,
  barbershopMembersByBarbershopIdQueryOptions,
  servicesForBarberQueryOptions,
  useBarbershopMembersByBarbershopId,
} from "@/hooks/use-barbershop-members";
import { profileQueryOptions } from "@/hooks/use-profile";
import {
  barbershopRatingQueryOptions,
  reviewsByBarbershopQueryOptions,
} from "@/hooks/use-reviews";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { useSession } from "@/hooks/use-session";
import {
  barbershopSeo,
  barbershopStructuredData,
  breadcrumbStructuredData,
  cn,
  getCanonicalUrl,
} from "@/lib/utils";

const BarbershopHeader = lazy(() =>
  import("@/components/barbershops/barbershop-header").then((module) => ({
    default: module.BarbershopHeader,
  })),
);

const ServicesGrid = lazy(() =>
  import("@/components/barbershops/services/services-grid").then((module) => ({
    default: module.ServicesGrid,
  })),
);

const BarbershopLocationSection = lazy(() =>
  import("@/components/barbershops/barbershop-location-section").then(
    (module) => ({
      default: module.BarbershopLocationSection,
    }),
  ),
);

const BarberTeamSection = lazy(() =>
  import("@/components/barbershops/barber-team-section").then((module) => ({
    default: module.BarberTeamSection,
  })),
);

const BarbershopReviews = lazy(() =>
  import("@/components/barbershops/barbershop-reviews").then((module) => ({
    default: module.BarbershopReviews,
  })),
);

export const Route = createFileRoute("/barbershops/$barbershopUuid/")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  ssr: true,
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async ({ context, params }) => {
    // Critical, above-the-fold identity — block on the shop.
    const barbershop = await context.queryClient.ensureQueryData(
      barbershopByUuidQueryOptions(params.barbershopUuid),
    );

    if (barbershop?._id) {
      // Primary content (services list + the barbers it lets you pick) — block
      // the initial render on these.
      const [, barbershopMembers] = await Promise.all([
        context.queryClient.ensureQueryData(
          servicesQueryOptions(barbershop._id),
        ),
        context.queryClient.ensureQueryData(
          barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
        ),
      ]);

      // Secondary / below-the-fold / interaction-only data — prime the cache
      // without blocking. prefetchQuery never throws, and the streaming SSR
      // integration hands these to the components' <Suspense>/<Hydrate>
      // boundaries (availability + per-barber services are for the booking flow,
      // location feeds the lazily-hydrated map).
      void context.queryClient.prefetchQuery(
        barbershopAvailabilityQueryOptions(barbershop._id),
      );
      void context.queryClient.prefetchQuery(
        barbershopLocationQueryOptions(barbershop._id),
      );
      void context.queryClient.prefetchQuery(
        reviewsByBarbershopQueryOptions(barbershop._id, 6),
      );
      void context.queryClient.prefetchQuery(
        barbershopRatingQueryOptions(barbershop._id),
      );
      for (const barbershopMember of barbershopMembers) {
        void context.queryClient.prefetchQuery(
          servicesForBarberQueryOptions(barbershopMember._id),
        );
      }
    }

    // Viewer-specific data (used by the booking flow / barber checks, not the
    // first paint) — fire-and-forget so an authenticated session never blocks.
    if (context.userId) {
      void context.queryClient.prefetchQuery(
        profileQueryOptions(context.userId),
      );
      void context.queryClient.prefetchQuery(
        barberByUserIdQueryOptions(context.userId),
      );
    }

    return {
      seoBarbershop: barbershop,
    };
  },
  head: ({ loaderData }) => {
    const barbershop = loaderData?.seoBarbershop;

    return {
      meta: barbershopSeo(barbershop!),
      links: [
        {
          rel: "canonical",
          href: getCanonicalUrl(`/barbershops/${barbershop?.uuid}`),
        },
      ],
      scripts: [
        ...(barbershop
          ? [
              barbershopStructuredData(barbershop),
              breadcrumbStructuredData([
                { name: "Inicio", url: getCanonicalUrl("/") },
                { name: "Barberías", url: getCanonicalUrl("/barbershops") },
                {
                  name: barbershop.name,
                  url: getCanonicalUrl(`/barbershops/${barbershop.uuid}`),
                },
              ]),
            ]
          : []),
      ],
    };
  },
});

function RouteComponent() {
  const { barbershopUuid } = Route.useParams();

  const { data: user } = useSession();
  const [_, _setCarouselApi] = useCarouselApi();

  const { data: barbershop } = useBarbershopByUuid(barbershopUuid);
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);
  const { data: barbershopMembers } = useBarbershopMembersByBarbershopId(
    barbershop?._id!,
  );

  const reviewsSkeleton = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton
          key={`review-skeleton-${i.toString()}`}
          className="h-28 w-full rounded-xl"
        />
      ))}
    </div>
  );

  return (
    <BorderContainer>
      <main className="space-y-4 md:space-y-2">
        <Link
          to="/barbershops"
          className={cn(
            buttonVariants({
              variant: "link",
            }),
            "text-muted-foreground",
          )}
        >
          <ArrowLeftIcon />
          Volver a la lista
        </Link>

        <Suspense
          fallback={
            <div className="space-y-4">
              <div className="flex gap-4">
                <Skeleton className="size-28 rounded-2xl sm:size-32" />
                <div className="flex flex-1 flex-col gap-2 pt-1">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-full max-w-xs" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>

              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-9 w-44" />
            </div>
          }
        >
          <BarbershopHeader
            barbershop={barbershop}
            userId={user?.id!}
            availability={barbershop?.availability!}
            logoKey={barbershop?.logoKey}
          />
        </Suspense>

        <Separator className="my-6" />

        <section className="space-y-4">
          <h2 className="text-balance font-semibold text-xl tracking-tight">
            Servicios ofrecidos
          </h2>

          <Suspense fallback={<ServicesSkeleton />}>
            {barbershop?.uuid && (
              <ServicesGrid
                services={services}
                barbers={barbershopMembers}
                barbershopId={barbershop?._id!}
                barbershopUuid={barbershop.uuid}
              />
            )}

            {services?.length < 1 && (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No hay servicios disponibles.</EmptyTitle>
                  <EmptyDescription>
                    Cuando se agregue un servicio, podrás verlo aquí.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </Suspense>
        </section>

        {barbershopMembers && barbershopMembers.length > 0 && (
          <>
            <Separator className="my-6" />

            <section className="space-y-4">
              <h2 className="text-balance font-semibold text-xl tracking-tight">
                Nuestro equipo
              </h2>

              <Hydrate
                when={visible({ rootMargin: "200px" })}
                fallback={
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton
                        key={`team-skeleton-${i.toString()}`}
                        className="h-16 w-full rounded-lg"
                      />
                    ))}
                  </div>
                }
              >
                <BarberTeamSection barbers={barbershopMembers} />
              </Hydrate>
            </section>
          </>
        )}

        {/* Heavy interactive map, below the fold: keep it code-split via lazy()
            and defer hydration (and therefore the chunk download) until it
            scrolls into view. */}
        {barbershop?._id && (
          <Hydrate when={visible({ rootMargin: "200px" })} split={false}>
            <BarbershopLocationSection
              barbershopId={barbershop._id}
              barbershopName={barbershop.name}
            />
          </Hydrate>
        )}

        {barbershop?._id && (
          <>
            <Separator className="my-6" />

            <section className="space-y-4">
              <h2 className="text-balance font-semibold text-xl tracking-tight">
                Reseñas
              </h2>

              <Hydrate
                when={visible({ rootMargin: "200px" })}
                fallback={reviewsSkeleton}
              >
                <Suspense fallback={reviewsSkeleton}>
                  <BarbershopReviews barbershopId={barbershop._id} />
                </Suspense>
              </Hydrate>
            </section>
          </>
        )}
      </main>
    </BorderContainer>
  );
}
