/** biome-ignore-all lint/style/noNonNullAssertion: objects are guaranteed to be not null */
import { useSession } from "@panabarbero/convex/auth";
import type { Barbershop } from "@panabarbero/convex/schemas";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";

import { BarbershopRating } from "@/components/barbershops/rating";
import { ReviewForm } from "@/components/barbershops/reviews/review-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarouselApi,
} from "@/components/ui/carousel";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useCanReview } from "@/hooks/use-actions";
import {
  barbershopByUuidQueryOptions,
  useBarbershopByUuid,
} from "@/hooks/use-barbershop";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useServicesFromBarbershop } from "@/hooks/use-services";
import { formatCurrency } from "@/lib/form-utils";
import { barbershopSeo } from "@/lib/utils";

// @ts-expect-error
import "react-lazy-load-image-component/src/effects/blur.css";

export const Route = createFileRoute("/barbershops/$barbershopUuid")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    return await context.queryClient.ensureQueryData(
      barbershopByUuidQueryOptions(params.barbershopUuid),
    );
  },
  head: ({ loaderData }) => {
    return {
      meta: barbershopSeo(loaderData as Barbershop),
    };
  },
  ssr: true,
});

function RouteComponent() {
  const [_, setCarouselApi] = useCarouselApi();

  const params = Route.useParams();

  const { data: barbershop, isLoading } = useBarbershopByUuid(
    params.barbershopUuid,
  );
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);

  const { data } = useSession();

  const { isMobile } = useIsMobile();

  const canReview = useCanReview({
    userId: data?.user?.id!,
    barbershopId: barbershop?._id!,
  });

  const formHeadLabel = "¡Tu opinión ayuda a mejorar el trabajo de todos!";

  return (
    <div className="w-full">
      <main className="container mx-auto min-h-[calc(100dvh-65px)] border-x px-4 py-8 md:px-8 lg:px-16">
        <header className="flex w-full flex-row justify-between gap-4">
          <section className="space-y-1">
            <h1
              className="text-balance font-bold text-2xl tracking-tight"
              style={{
                viewTransitionName: `barbershop-${barbershop?.uuid}`,
              }}
            >
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
                      {data?.user && (
                        <DrawerHeader>
                          <DrawerTitle>{formHeadLabel}</DrawerTitle>
                        </DrawerHeader>
                      )}
                      <DrawerFooter>
                        {data?.user ? (
                          canReview ? (
                            <ReviewForm
                              barbershopId={barbershop?._id!}
                              userId={data?.user?.id!}
                            />
                          ) : (
                            <p className="text-pretty text-center text-muted-foreground text-sm">
                              Necesitas haber asistido a la barbería mediante
                              una cita para poder calificar.
                            </p>
                          )
                        ) : (
                          <Button
                            asChild
                            variant="link"
                            size="sm"
                            className="pb-4 text-muted-foreground"
                          >
                            <Link to="/login">
                              Necesitas una cuenta para poder calificar.
                            </Link>
                          </Button>
                        )}
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
                            barbershopId={barbershop?._id!}
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
            {isLoading ? (
              <Skeleton className="size-16 rounded-full object-cover md:size-24 lg:size-28" />
            ) : (
              <img
                loading="lazy"
                decoding="async"
                alt={`Banner de ${barbershop?.name}`}
                src={barbershop?.bannerUrl ?? "/default-logo.png"}
                style={{
                  viewTransitionName: `barbershop-${barbershop?.uuid}-banner`,
                }}
                className="size-16 rounded-full object-cover md:size-24 lg:size-28"
              />
            )}
          </section>
        </header>

        <Separator className="mt-8 mb-6" />

        <section className="space-y-4">
          <h2 className="my-6 text-balance text-center font-semibold text-xl tracking-tight">
            Servicios ofrecidos:
          </h2>
          {services && services.length > 0 ? (
            <Carousel
              setApi={setCarouselApi}
              className="mx-auto w-full max-w-6xl"
              opts={{ loop: true }}
            >
              <CarouselContent>
                {services.map((service) => (
                  <CarouselItem
                    key={service._id}
                    className="md:basis-1/2 lg:basis-1/3"
                  >
                    <Card className="transition-transform duration-500">
                      <CardContent className="flex min-h-48 flex-col gap-1 px-4">
                        <section className="flex-1 space-y-1">
                          <p className="text-pretty font-semibold tracking-tight">
                            {service.name}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {formatCurrency(service.price)}
                          </p>
                        </section>
                        {service.duration && (
                          <p className="inline-flex items-center gap-1 text-muted-foreground text-sm tracking-tight">
                            <Clock className="size-3" /> {service.duration}{" "}
                            minutos
                          </p>
                        )}
                        <Button variant="outline" size="sm">
                          Reservar
                        </Button>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
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
