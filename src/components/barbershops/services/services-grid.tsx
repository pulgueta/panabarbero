import type {
  Barbershop,
  BarbershopMemberWithName,
  Service,
} from "@convex/schema";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ServicesGridProps {
  services: Service[];
  barbers: BarbershopMemberWithName[];
  barbershopId: Barbershop["_id"];
  barbershopUuid: string;
}

export const ServicesGrid: FC<ServicesGridProps> = ({
  services,
  barbershopUuid,
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
            <CardDescription>
              Duración: {service.duration} minutos
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-between">
            <p>
              Valor:{" "}
              <span className="font-semibold tabular-nums">
                {formatCurrency(service.price)}
              </span>
            </p>

            <Button
              nativeButton={false}
              render={
                <Link
                  to="/barbershops/$barbershopUuid/book"
                  params={{ barbershopUuid }}
                  search={{ serviceId: service._id }}
                />
              }
            >
              Reservar
            </Button>
          </CardFooter>
        </Card>
      ))}
    </article>
  );
};
