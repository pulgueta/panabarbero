/** biome-ignore-all lint/style/noNonNullAssertion: objects are guaranteed to be not null */
/** biome-ignore-all lint/suspicious/noNonNullAssertedOptionalChain: objects are guaranteed to be not null */

import { ArrowLeftIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
  barberByUserIdQueryOptions,
  barbershopMembersByBarbershopIdQueryOptions,
  servicesForBarberQueryOptions,
  useBarbershopMembersByBarbershopId,
} from "@/hooks/use-barbershop-members";
import { profileQueryOptions } from "@/hooks/use-profile";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";
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

const BarberTeamSection = lazy(() =>
  import("@/components/barbershops/barber-team-section").then((module) => ({
    default: module.BarberTeamSection,
  })),
);

export const Route = createFileRoute("/barbershops/$barbershopUuid")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  loader: async ({ context, params }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    const barbershop = await context.queryClient.ensureQueryData(
      barbershopByUuidQueryOptions(params.barbershopUuid),
    );

    if (user?.userId) {
      await context.queryClient.ensureQueryData(
        profileQueryOptions(user.userId),
      );

      await context.queryClient.ensureQueryData(
        barberByUserIdQueryOptions(user.userId),
      );
    }

    if (barbershop?._id) {
      const [, barbershopMembers] = await Promise.all([
        context.queryClient.ensureQueryData(
          servicesQueryOptions(barbershop._id),
        ),
        context.queryClient.ensureQueryData(
          barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
        ),
        context.queryClient.ensureQueryData(
          barbershopAvailabilityQueryOptions(barbershop._id),
        ),
      ]);

      if (barbershopMembers.length > 0) {
        await Promise.all(
          barbershopMembers.map((barbershopMember) =>
            context.queryClient.ensureQueryData(
              servicesForBarberQueryOptions(barbershopMember._id),
            ),
          ),
        );
      }
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
  ssr: true,
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
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
            userId={user?.userId!}
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
            <ServicesGrid
              services={services}
              barbers={barbershopMembers}
              barbershopId={barbershop?._id!}
            />

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

              <Suspense
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
              </Suspense>
            </section>
          </>
        )}
      </main>
    </BorderContainer>
  );
}
