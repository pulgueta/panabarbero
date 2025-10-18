import { convexQuery } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { BarbershopRating } from "@/components/barbershops/rating";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/barbershops/$barbershopUuid")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.barbershops.getBarbershopByUuid, {
        uuid: params.barbershopUuid,
      }),
    );
  },
  ssr: true,
});

function RouteComponent() {
  const params = Route.useParams();
  const { data: barbershop } = useSuspenseQuery(
    convexQuery(api.barbershops.getBarbershopByUuid, {
      uuid: params.barbershopUuid,
    }),
  );

  const { data: services } = useQuery(
    convexQuery(api.services.getServicesByBarbershopId, {
      // biome-ignore lint/style/noNonNullAssertion: barbershop is guaranteed to be not null
      barbershopId: barbershop?._id!,
    }),
  );

  return (
    <div className="w-full">
      <main className="container mx-auto min-h-[calc(100dvh-65px)] border-x px-4 py-8 md:px-8 lg:px-16">
        <header className="flex w-full flex-row justify-between gap-4">
          <section className="space-y-1">
            <h1 className="text-balance font-bold text-2xl tracking-tight">
              {barbershop?.name}
            </h1>

            <div className="flex flex-col">
              <BarbershopRating
                value={barbershop?.metadata?.rating ?? 0}
                readOnly
              />
              <p className="mt-px text-muted-foreground text-xs md:text-sm">
                {barbershop?.metadata?.reviews} calificaciones
              </p>
            </div>

            {barbershop?.description && (
              <p className="text-pretty text-muted-foreground text-sm md:text-base">
                {barbershop.description}
              </p>
            )}
          </section>
          <section>
            <Avatar className="size-16 md:size-24 lg:size-28">
              <AvatarImage src={barbershop?.bannerUrl ?? "/default-logo.png"} />
            </Avatar>
          </section>
        </header>

        <Separator className="mt-8 mb-6" />

        <section className="space-y-4">
          <h2 className="text-balance text-center font-semibold text-lg tracking-tight">
            Servicios ofrecidos:
          </h2>
          {services && services.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {services.map((service) => (
                <div
                  key={service._id}
                  className="flex flex-col gap-2 rounded-lg border bg-white p-4 shadow-sm"
                >
                  <h3 className="font-semibold text-lg">{service.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    Precio: $
                    {service.price?.toFixed
                      ? service.price.toFixed(2)
                      : service.price}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Duración: {service.duration} min
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              No hay servicios disponibles.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
