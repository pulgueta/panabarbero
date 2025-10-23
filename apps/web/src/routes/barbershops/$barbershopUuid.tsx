/** biome-ignore-all lint/style/noNonNullAssertion: objects are guaranteed to be not null */
import { createFileRoute } from "@tanstack/react-router";

import { BarbershopAvatar } from "@/components/barbershops/barbershop-avatar";
import { BarbershopHeader } from "@/components/barbershops/barbershop-header";
import { BarbershopServicesCarousel } from "@/components/barbershops/barbershop-services-carousel";
import { useCarouselApi } from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import {
  barbershopByUuidQueryOptions,
  useBarbershopByUuid,
} from "@/hooks/use-barbershop";
import { useServicesFromBarbershop } from "@/hooks/use-services";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/barbershops/$barbershopUuid")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    return await context.queryClient.ensureQueryData(
      barbershopByUuidQueryOptions(params.barbershopUuid),
    );
  },
  ssr: true,
});

function RouteComponent() {
  const [_, _setCarouselApi] = useCarouselApi();

  const params = Route.useParams();

  const { data: barbershop, isLoading } = useBarbershopByUuid(
    params.barbershopUuid,
  );
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);

  const { data: user } = useSession();

  return (
    <div className="w-full">
      <main className="container mx-auto min-h-[calc(100dvh-65px)] border-x px-4 py-8 md:px-8 lg:px-16">
        <header className="flex w-full flex-row justify-between gap-4">
          <BarbershopHeader barbershop={barbershop} userId={user?.user.id!} />

          <section>
            <BarbershopAvatar barbershop={barbershop} isLoading={isLoading} />
          </section>
        </header>

        <Separator className="mt-8 mb-6" />

        <section className="space-y-4">
          <h2 className="my-6 text-balance text-center font-semibold text-xl tracking-tight">
            Servicios ofrecidos:
          </h2>

          {services && services.length > 0 ? (
            <BarbershopServicesCarousel services={services} />
          ) : (
            <p className="text-pretty text-center text-muted-foreground">
              No hay servicios disponibles.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
