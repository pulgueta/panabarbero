/** biome-ignore-all lint/style/noNonNullAssertion: objects are guaranteed to be not null */
/** biome-ignore-all lint/suspicious/noNonNullAssertedOptionalChain: objects are guaranteed to be not null */

import { ArrowLeftIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Hydrate } from "@tanstack/react-start";
import { visible } from "@tanstack/react-start/hydration";
import { lazy, Suspense } from "react";
import { z } from "zod";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ServicesSkeleton } from "@/components/layout/skeleton/services-skeleton";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import {
  barbershopAvailabilityQueryOptions,
  barbershopByUuidQueryOptions,
  useBarbershopByUuid,
} from "@/hooks/barbershop/use-barbershop";
import { barbershopMetadataQueryOptions } from "@/hooks/barbershop/use-barbershop-metadata";
import {
  barberByUserIdQueryOptions,
  barbershopMembersByBarbershopIdQueryOptions,
  servicesForBarberQueryOptions,
  useBarbershopMembersByBarbershopId,
} from "@/hooks/use-barbershop-members";
import { profileQueryOptions } from "@/hooks/use-profile";
import {
  barbershopRatingDistributionQueryOptions,
  barbershopRatingQueryOptions,
  reviewableForBarbershopQueryOptions,
  reviewsByBarbershopQueryOptions,
} from "@/hooks/use-reviews";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
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

const BarbershopInfoCard = lazy(() =>
  import("@/components/barbershops/barbershop-info-card").then((module) => ({
    default: module.BarbershopInfoCard,
  })),
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
    if (!z.uuidv4().safeParse(params.barbershopUuid).success) {
      throw notFound();
    }

    // Critical, above-the-fold identity — block on the shop.
    const barbershop = await context.queryClient.ensureQueryData(
      barbershopByUuidQueryOptions(params.barbershopUuid),
    );

    if (!barbershop?._id || !barbershop.isActive) {
      throw notFound();
    }

    // Primary content (services list + the barbers it lets you pick) — block
    // the initial render on these.
    const [, barbershopMembers] = await Promise.all([
      context.queryClient.ensureQueryData(servicesQueryOptions(barbershop._id)),
      context.queryClient.ensureQueryData(
        barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
      ),
    ]);

    // Secondary / below-the-fold / interaction-only data — prime the cache
    // without blocking. prefetchQuery never throws, and the streaming SSR
    // integration hands these to the components' <Suspense>/<Hydrate>
    // boundaries (availability + per-barber services are for the booking flow,
    // metadata feeds the lazily-hydrated info card).
    void context.queryClient.prefetchQuery(
      barbershopAvailabilityQueryOptions(barbershop._id),
    );
    void context.queryClient.prefetchQuery(
      barbershopMetadataQueryOptions(barbershop._id),
    );
    void context.queryClient.prefetchQuery(
      reviewsByBarbershopQueryOptions(barbershop._id, 6),
    );
    void context.queryClient.prefetchQuery(
      barbershopRatingQueryOptions(barbershop._id),
    );
    void context.queryClient.prefetchQuery(
      barbershopRatingDistributionQueryOptions(barbershop._id),
    );
    if (context.userId) {
      void context.queryClient.prefetchQuery(
        reviewableForBarbershopQueryOptions(barbershop._id),
      );
    }
    for (const barbershopMember of barbershopMembers) {
      void context.queryClient.prefetchQuery(
        servicesForBarberQueryOptions(barbershopMember._id),
      );
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

const reviewsSkeleton = <Skeleton className="h-72 w-full rounded-xl" />;

function RouteComponent() {
  const { barbershopUuid } = Route.useParams();
  const isAuthed = Route.useRouteContext({
    select: (context) => Boolean(context.userId),
  });

  const { data: barbershop } = useBarbershopByUuid(barbershopUuid);
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);
  const { data: barbershopMembers } = useBarbershopMembersByBarbershopId(
    barbershop?._id!,
  );

  return (
    <BorderContainer>
      <main className="space-y-5">
        <Link
          to="/barbershops"
          className={cn(
            buttonVariants({
              variant: "ghost",
              size: "sm",
            }),
            "text-muted-foreground",
          )}
        >
          <ArrowLeftIcon />
          Barberías
        </Link>

        <Suspense
          fallback={
            <div className="flex gap-4">
              <Skeleton className="size-16 rounded-xl md:size-18" />
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-full max-w-xs" />
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          }
        >
          <BarbershopHeader
            barbershop={barbershop!}
            logoKey={barbershop?.logoKey}
          />
        </Suspense>

        {barbershop?.description && (
          <p className="max-w-prose text-pretty text-muted-foreground text-sm leading-relaxed md:text-base">
            {barbershop.description}
          </p>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-2 space-y-4">
            <Suspense fallback={<ServicesSkeleton />}>
              {barbershop?.uuid && services?.length > 0 && (
                <ServicesGrid
                  services={services}
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

            {barbershopMembers && barbershopMembers.length > 0 && (
              <Hydrate
                when={visible({ rootMargin: "200px" })}
                fallback={<Skeleton className="h-48 w-full rounded-xl" />}
              >
                <BarberTeamSection barbers={barbershopMembers} />
              </Hydrate>
            )}

            {barbershop?._id && (
              <Hydrate
                when={visible({ rootMargin: "200px" })}
                fallback={reviewsSkeleton}
              >
                <Suspense fallback={reviewsSkeleton}>
                  <BarbershopReviews
                    barbershopId={barbershop._id}
                    isAuthed={isAuthed}
                  />
                </Suspense>
              </Hydrate>
            )}
          </div>

          {barbershop?._id && (
            <aside className="w-full lg:max-w-sm lg:flex-1">
              <Suspense
                fallback={<Skeleton className="h-48 w-full rounded-xl" />}
              >
                <Hydrate when={visible({ rootMargin: "200px" })} split={false}>
                  <BarbershopInfoCard barbershop={barbershop} />
                </Hydrate>
              </Suspense>
            </aside>
          )}
        </div>
      </main>
    </BorderContainer>
  );
}
