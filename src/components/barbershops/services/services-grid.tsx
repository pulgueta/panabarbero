import type {
  Barbershop,
  BarbershopMemberWithName,
  Service,
} from "@convex/schema";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

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
            <Link
              to="/barbershops/$barbershopUuid/book"
              params={{ barbershopUuid }}
              search={{ serviceId: service._id }}
              className={cn(
                buttonVariants({ variant: "default" }),
                "w-full justify-center",
              )}
            >
              Reservar
            </Link>
          </CardFooter>
        </Card>
      ))}
    </article>
  );
};
