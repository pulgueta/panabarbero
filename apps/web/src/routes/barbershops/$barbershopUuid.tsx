import { convexQuery } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import { useSession } from "@panabarbero/convex/auth";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { BarbershopRating } from "@/components/barbershops/rating";
import { ReviewForm } from "@/components/barbershops/reviews/review-form";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import useIsMobile from "@/hooks/use-is-mobile";

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

  const { data } = useSession();

  const { isMobile } = useIsMobile();

  const { data: services } = useQuery(
    convexQuery(api.services.getServicesByBarbershopId, {
      // biome-ignore lint/style/noNonNullAssertion: barbershop is guaranteed to be not null
      barbershopId: barbershop?._id!,
    }),
  );

  const { data: canReview } = useQuery(
    convexQuery(api.reviews.canReview, {
      userId: data?.user?.id ?? "",
      // biome-ignore lint/style/noNonNullAssertion: barbershop is guaranteed to be not null
      barbershopId: barbershop?._id!,
    }),
  );

  const formHeadLabel = "¡Tu opinión ayuda a mejorar el trabajo de todos!";

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

              <p className="mt-px inline-flex items-center gap-1 text-muted-foreground text-xs md:text-sm">
                {barbershop?.metadata?.reviews} calificaciones.
                {isMobile ? (
                  <Drawer>
                    <DrawerTrigger asChild>
                      <Button
                        variant="link"
                        size="sm"
                        className="px-0 text-muted-foreground text-xs md:text-sm"
                      >
                        Calificar
                      </Button>
                    </DrawerTrigger>
                    <DrawerContent>
                      <DrawerHeader>
                        <DrawerTitle>{formHeadLabel}</DrawerTitle>
                      </DrawerHeader>
                      <DrawerFooter>
                        <ReviewForm
                          // biome-ignore lint/style/noNonNullAssertion: barbershop is guaranteed to be not null
                          barbershopId={barbershop?._id!}
                          // biome-ignore lint/style/noNonNullAssertion: user is guaranteed to be not null
                          userId={data?.user?.id!}
                        />
                      </DrawerFooter>
                    </DrawerContent>
                  </Drawer>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="link"
                        size="sm"
                        className="px-0 text-muted-foreground text-xs md:text-sm"
                      >
                        Calificar
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full max-w-sm">
                      {data?.user ? (
                        canReview ? (
                          <ReviewForm
                            // biome-ignore lint/style/noNonNullAssertion: barbershop is guaranteed to be not null
                            barbershopId={barbershop?._id!}
                            // biome-ignore lint/style/noNonNullAssertion: user is guaranteed to be not null
                            userId={data?.user?.id!}
                            formHeadLabel="¡Tu opinión ayuda a mejorar el trabajo de todos!"
                          />
                        ) : (
                          <p className="text-pretty text-center text-muted-foreground text-sm">
                            Necesitas haber asistido a la barbería mediante una
                            cita para poder calificar.
                          </p>
                        )
                      ) : (
                        <Button
                          asChild
                          variant="link"
                          size="sm"
                          className="text-muted-foreground"
                        >
                          <Link to="/login">
                            Necesitas una cuenta para poder calificar.
                          </Link>
                        </Button>
                      )}
                    </PopoverContent>
                  </Popover>
                )}
              </p>
            </div>

            {barbershop?.description && (
              <p className="text-pretty text-muted-foreground text-sm md:text-base">
                {barbershop.description ?? "No hay descripción disponible."}
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
