/** biome-ignore-all lint/style/noNonNullAssertion: objects are guaranteed to be not null */

import { createFileRoute } from "@tanstack/react-router";
import { Activity, Suspense } from "react";

import { BarbershopAvatar } from "@/components/barbershops/barbershop-avatar";
import { BarbershopHeader } from "@/components/barbershops/barbershop-header";
import { ServicesCarousel } from "@/components/barbershops/services/services-carousel";
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
  barbersByBarbershopIdQueryOptions,
  useBarbersByBarbershopId,
} from "@/hooks/use-barbershop-members";
import { profileQueryOptions } from "@/hooks/use-profile";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";
import { barbershopSeo } from "@/lib/utils";

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
    }

    if (barbershop?._id) {
      await context.queryClient.ensureQueryData(
        servicesQueryOptions(barbershop._id),
      );
      await context.queryClient.ensureQueryData(
        barbersByBarbershopIdQueryOptions(barbershop._id),
      );
    }

    return {
      barbershop,
    };
  },
  head: ({ loaderData }) => ({
    meta: barbershopSeo(loaderData?.barbershop!),
  }),
});

function RouteComponent() {
  const { barbershopUuid } = Route.useParams();

  const { data: user } = useSession();

  const [_, _setCarouselApi] = useCarouselApi();

  const { data: barbershop, isLoading: isLoadingBarbershop } =
    useBarbershopByUuid(barbershopUuid);
  const { data: services, isLoading: isLoadingServices } =
    useServicesFromBarbershop(barbershop?._id!);
  const { data: barbers, isLoading: isLoadingBarbers } =
    useBarbersByBarbershopId(barbershop?._id!);

  return (
    <div className="w-full">
      <main className="container mx-auto min-h-[calc(100dvh-65px)] border-x">
        <header className="flex w-full flex-row justify-between gap-4 px-4 pt-8 md:px-8 lg:px-16">
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <Activity mode={isLoadingBarbershop ? "hidden" : "visible"}>
              <BarbershopHeader
                barbershop={barbershop}
                userId={user?.userId!}
                availability={barbershop?.availability!}
              />

              <section>
                <BarbershopAvatar barbershop={barbershop} size="lg" />
              </section>
            </Activity>
          </Suspense>
        </header>

        <Separator className="mt-8 mb-6" />

        <section className="space-y-4 px-4 md:px-8 lg:px-16">
          <h2 className="my-6 text-balance text-center font-semibold text-xl tracking-tight">
            Servicios ofrecidos:
          </h2>

          <Suspense fallback={<ServicesSkeleton />}>
            <Activity
              mode={
                isLoadingServices || isLoadingBarbers ? "hidden" : "visible"
              }
            >
              <ServicesCarousel services={services} barbers={barbers} />
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
    </div>
  );
}
