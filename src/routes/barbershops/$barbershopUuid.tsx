/** biome-ignore-all lint/style/noNonNullAssertion: objects are guaranteed to be not null */
/** biome-ignore-all lint/suspicious/noNonNullAssertedOptionalChain: objects are guaranteed to be not null */

import { createFileRoute } from "@tanstack/react-router";
import { Activity, lazy, Suspense } from "react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ServicesSkeleton } from "@/components/layout/skeleton/services-skeleton";
import { useCarouselApi } from "@/components/ui/carousel";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  barbershopByUuidQueryOptions,
  useBarbershopByUuid,
} from "@/hooks/barbershop/use-barbershop";
import {
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
import { barbershopSeo } from "@/lib/utils";

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

export const Route = createFileRoute("/barbershops/$barbershopUuid")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  beforeLoad: async ({ context, params }) => {
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
    }

    if (barbershop?._id) {
      await context.queryClient.ensureQueryData(
        servicesQueryOptions(barbershop._id),
      );

      const barbershopMembers = await context.queryClient.ensureQueryData(
        barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
      );

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
  head: ({ match }) => {
    const barbershop = match.context.seoBarbershop;

    return {
      meta: barbershopSeo(barbershop),
      links: [
        {
          rel: "canonical",
          href: `https://panabarbero.com/barbershops/${barbershop?.uuid}`,
        },
      ],
    };
  },
  ssr: true,
});

function RouteComponent() {
  const { barbershopUuid } = Route.useParams();

  const { data: user } = useSession();

  const [_, _setCarouselApi] = useCarouselApi();

  const { data: barbershop, isLoading: isLoadingBarbershop } =
    useBarbershopByUuid(barbershopUuid);
  const { data: services, isLoading: isLoadingServices } =
    useServicesFromBarbershop(barbershop?._id!);
  const { data: barbershopMembers, isLoading: isLoadingBarbershopMembers } =
    useBarbershopMembersByBarbershopId(barbershop?._id!);

  return (
    <BorderContainer>
      <main>
        <header className="flex w-full flex-row justify-between gap-4">
          <Activity mode={isLoadingBarbershop ? "hidden" : "visible"}>
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
              <BarbershopHeader
                barbershop={barbershop}
                userId={user?.userId!}
                availability={barbershop?.availability!}
              />

              {/* <section>
                <BarbershopAvatar barbershop={barbershop} size="lg" />
              </section> */}
            </Suspense>
          </Activity>
        </header>

        <Separator className="mt-8 mb-6" />

        <section className="space-y-4">
          <h2 className="my-6 text-balance text-center font-semibold text-xl tracking-tight">
            Servicios ofrecidos:
          </h2>

          <Suspense fallback={<ServicesSkeleton />}>
            <Activity
              mode={
                isLoadingServices ||
                isLoadingBarbershopMembers ||
                !barbershop?._id
                  ? "hidden"
                  : "visible"
              }
            >
              <ServicesGrid
                services={services}
                barbers={barbershopMembers}
                barbershopId={barbershop?._id!}
              />
            </Activity>
          </Suspense>

          {!services?.length && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No hay servicios disponibles.</EmptyTitle>
                <EmptyDescription>
                  Cuando se agregue un servicio, podrás verlo aquí.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {/* {isLoadingServices || isLoadingAvailability ? (
            <Skeleton className="h-48 w-full" />
          ) : services && services.length > 0 && availability ? (
            <ServicesCarousel services={services} />
          ) : (
            <p
              className="text-pretty text-center text-muted-foreground"
              style={{
                viewTransitionName: "barbershop-services",
              }}
            >
              No hay servicios disponibles.
            </p>
          )} */}
        </section>
      </main>
    </BorderContainer>
  );
}
