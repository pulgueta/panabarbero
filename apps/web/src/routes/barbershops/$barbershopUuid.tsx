/** biome-ignore-all lint/style/noNonNullAssertion: objects are guaranteed to be not null */
import { createFileRoute } from "@tanstack/react-router";

import { BarbershopAvatar } from "@/components/barbershops/barbershop-avatar";
import { BarbershopHeader } from "@/components/barbershops/barbershop-header";
import { ServicesCarousel } from "@/components/barbershops/services/services-carousel";
import { LoadingComponent } from "@/components/layout/loading-component";
import { useCarouselApi } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import {
  barbershopAvailabilityQueryOptions,
  barbershopByUuidQueryOptions,
  isBarbershopOwnerQueryOptions,
  useBarbershopByUuid,
} from "@/hooks/barbershop/use-barbershop";
import { barbersByBarbershopIdQueryOptions } from "@/hooks/use-barbers";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/barbershops/$barbershopUuid")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );
    const barbershop = await context.queryClient.ensureQueryData(
      barbershopByUuidQueryOptions(params.barbershopUuid),
    );

    await context.queryClient.prefetchQuery(
      barbersByBarbershopIdQueryOptions(barbershop?._id!),
    );
    await context.queryClient.prefetchQuery(
      servicesQueryOptions(barbershop?._id!),
    );
    await context.queryClient.prefetchQuery(
      barbershopAvailabilityQueryOptions(barbershop?._id!),
    );
    await context.queryClient.prefetchQuery(
      isBarbershopOwnerQueryOptions(barbershop?._id!, user?.userId!),
    );
  },
  pendingComponent: LoadingComponent,
});

function RouteComponent() {
  const [_, _setCarouselApi] = useCarouselApi();

  const params = Route.useParams();

  const { data: barbershop } = useBarbershopByUuid(params.barbershopUuid);
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);

  const { data: user } = useSession();

  return (
    <div className="w-full">
      <main className="container mx-auto min-h-[calc(100dvh-65px)] border-x">
        <header className="flex w-full flex-row justify-between gap-4 px-4 pt-8 md:px-8 lg:px-16">
          <BarbershopHeader barbershop={barbershop} userId={user?.userId!} />

          <section>
            <BarbershopAvatar barbershop={barbershop} size="lg" />
          </section>
        </header>

        <Separator className="mt-8 mb-6" />

        <section className="space-y-4 px-4 md:px-8 lg:px-16">
          <h2 className="my-6 text-balance text-center font-semibold text-xl tracking-tight">
            Servicios ofrecidos:
          </h2>

          {services && services.length > 0 ? (
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
          )}
        </section>
      </main>
    </div>
  );
}
