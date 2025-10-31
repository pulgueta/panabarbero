import type { Service } from "@panabarbero/convex/schemas";
import { Clock } from "lucide-react";
import type { FC } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarouselApi,
} from "@/components/ui/carousel";
import { formatCurrency } from "@/lib/form-utils";
import { BookingButton } from "./booking-button";

interface ServicesCarouselProps {
  services: Service[];
}

export const ServicesCarousel: FC<ServicesCarouselProps> = (props) => {
  const { services } = props;
  const [_, setCarouselApi] = useCarouselApi();

  if (!services || services.length === 0) {
    return (
      <p
        className="text-center text-muted-foreground"
        style={{
          viewTransitionName: "barbershop-services",
        }}
      >
        No hay servicios disponibles.
      </p>
    );
  }

  return (
    <Carousel
      setApi={setCarouselApi}
      className="mx-auto w-full max-w-6xl"
      opts={{ loop: true }}
      style={{
        viewTransitionName: "barbershop-services",
      }}
    >
      <CarouselContent>
        {services.map((service) => (
          <CarouselItem
            key={service._id}
            className="mx-auto md:basis-1/2 lg:basis-1/3"
          >
            <Card className="max-h-36 bg-secondary/20 transition-transform duration-500 dark:bg-secondary/20">
              <CardContent className="flex items-start justify-between gap-4 px-4">
                <section className="flex flex-col items-start gap-2">
                  <p className="line-clamp-1 text-pretty font-semibold leading-4.5 tracking-tight">
                    {service.name}
                  </p>
                  <p className="text-muted-foreground text-sm tabular-nums tracking-tight">
                    {formatCurrency(service.price)}
                  </p>
                  <p className="mb-1 inline-flex items-center gap-1.5 text-muted-foreground text-xs tracking-tight">
                    <Clock className="size-3" />{" "}
                    {service.duration
                      ? `${service.duration} minutos`
                      : "No hay duración disponible"}
                  </p>
                </section>

                <BookingButton service={service} />
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
};
