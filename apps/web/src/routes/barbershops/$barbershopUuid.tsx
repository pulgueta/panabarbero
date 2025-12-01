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
} from "@/hooks/barbershop/use-barbershop";
import { servicesQueryOptions } from "@/hooks/use-services";
import { getSessionQueryOptions } from "@/hooks/use-session";

export const Route = createFileRoute("/barbershops/$barbershopUuid")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );
    const barbershop = await context.queryClient.ensureQueryData(
      barbershopByUuidQueryOptions(params.barbershopUuid),
    );

    let services = null;
    let availability = null;
    let isOwner = null;

    if (barbershop?._id) {
      services = await context.queryClient.ensureQueryData(
        servicesQueryOptions(barbershop._id),
      );
      availability = await context.queryClient.ensureQueryData(
        barbershopAvailabilityQueryOptions(barbershop._id),
      );

      if (user?.userId) {
        isOwner = await context.queryClient.ensureQueryData(
          isBarbershopOwnerQueryOptions(barbershop._id, user.userId),
        );
      }
    }

    return {
      barbershop,
      services,
      availability,
      isOwner,
      user,
    };
  },
  pendingComponent: LoadingComponent,
});

function RouteComponent() {
  const [_, _setCarouselApi] = useCarouselApi();

  const { barbershop, services, user, availability } = Route.useLoaderData();

  return (
    <div className="w-full">
      <main className="container mx-auto min-h-[calc(100dvh-65px)] border-x">
        <header className="flex w-full flex-row justify-between gap-4 px-4 pt-8 md:px-8 lg:px-16">
          <BarbershopHeader
            barbershop={barbershop}
            userId={user?.userId!}
            availability={availability}
          />

          <section>
            <BarbershopAvatar barbershop={barbershop} size="lg" />
          </section>
        </header>

        <Separator className="mt-8 mb-6" />

        <section className="space-y-4 px-4 md:px-8 lg:px-16">
          <h2 className="my-6 text-balance text-center font-semibold text-xl tracking-tight">
            Servicios ofrecidos:
          </h2>

          {services && services.length > 0 && availability ? (
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
