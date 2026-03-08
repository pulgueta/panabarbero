import type {
  Barbershop,
  BarbershopMemberWithName,
  Service,
} from "@convex/schema";
import type { FC } from "react";

import { CreateAppointmentDialog } from "@/components/appointments/create-appointment-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ServicesGridProps {
  services: Service[];
  barbers: BarbershopMemberWithName[];
  barbershopId: Barbershop["_id"];
}

export const ServicesGrid: FC<ServicesGridProps> = ({
  services,
  barbers,
  barbershopId,
}) => {
  const viewTransitionName =
    services.length > 0
      ? `barbershop-${services[0].barbershopId}-services`
      : undefined;

  return (
    <article
      className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      style={{ viewTransitionName }}
    >
      {services.map((service) => (
        <Card key={service._id}>
          <CardHeader className="border-b">
            <CardTitle>{service.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-lg">
              Valor:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {formatCurrency(service.price)}
              </span>
            </p>
            <p className="text-muted-foreground text-sm">
              Duración: {service.duration} min
            </p>
          </CardContent>
          <CardFooter>
            <CreateAppointmentDialog
              barbershopId={barbershopId}
              services={services}
              barbers={barbers}
              serviceId={service._id}
              trigger={
                <Button className="w-full" variant="default">
                  Reservar
                </Button>
              }
            />
          </CardFooter>
        </Card>
      ))}
    </article>
  );
};
