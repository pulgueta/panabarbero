import type { Service } from "@panabarbero/convex/schemas";
import { Clock } from "lucide-react";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarouselApi,
} from "@/components/ui/carousel";
import { formatCurrency } from "@/lib/form-utils";

interface BarbershopServicesCarouselProps {
  services: Service[];
}

export const BarbershopServicesCarousel: FC<BarbershopServicesCarouselProps> = (
  props,
) => {
  const { services } = props;
  const [_, setCarouselApi] = useCarouselApi();

  if (!services || services.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        No hay servicios disponibles.
      </p>
    );
  }

  return (
    <Carousel
      setApi={setCarouselApi}
      className="mx-auto w-full max-w-6xl"
      opts={{ loop: true }}
    >
      <CarouselContent>
        {services.map((service) => (
          <CarouselItem key={service._id} className="md:basis-1/2 lg:basis-1/3">
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
                    <Clock className="size-3" /> {service.duration} minutos
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
  );
};
