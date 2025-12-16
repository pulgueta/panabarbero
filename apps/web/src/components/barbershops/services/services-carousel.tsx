import type {
  BarbershopMemberWithName,
  Service,
} from "@panabarbero/convex/schemas";
import { Clock } from "lucide-react";
import type { FC } from "react";

import { CreateAppointmentDialog } from "@/components/appointments/create-appointment-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  useCarouselApi,
} from "@/components/ui/carousel";
import { formatCurrency } from "@/lib/form-utils";

interface ServicesCarouselProps {
  services: Service[];
  barbers: BarbershopMemberWithName[];
}

export const ServicesCarousel: FC<ServicesCarouselProps> = ({
  services,
  barbers,
}) => {
  const [_, setCarouselApi] = useCarouselApi();

  return (
    <Carousel
      setApi={setCarouselApi}
      className="mx-auto w-full max-w-6xl"
      opts={{ loop: true }}
      style={{
        viewTransitionName: `barbershop-${services[0].barbershopId}-services`,
      }}
    >
      <CarouselContent>
        {services.map((service) => (
          <CarouselItem
            key={service._id}
            className="mx-auto md:basis-1/2 lg:basis-1/3"
          >
            <Card className="max-h-36 transition-transform duration-500">
              <CardContent className="flex items-start justify-between gap-4 px-4">
                <section className="space-y-2">
                  <p className="line-clamp-1 text-pretty font-semibold leading-4.5 tracking-tight">
                    {service.name}
                  </p>
                  <p className="text-muted-foreground text-sm tabular-nums tracking-tight">
                    {formatCurrency(service.price)}
                  </p>
                  <p className="mb-1 inline-flex items-center gap-1.5 text-muted-foreground text-xs tracking-tight">
                    <Clock className="size-3" /> {service.duration} minutos
                  </p>
                </section>

                <CreateAppointmentDialog
                  service={service}
                  services={services}
                  barbers={barbers}
                  trigger={<Button>Reservar</Button>}
                />
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
};
