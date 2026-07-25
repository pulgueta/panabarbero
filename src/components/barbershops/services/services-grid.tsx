import type { Service } from "@convex/schema";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ServicesGridProps {
  services: Service[];
  barbershopUuid: string;
}

/** Detail-page services card: one bookable row per service. */
export const ServicesGrid: FC<ServicesGridProps> = ({
  services,
  barbershopUuid,
}) => {
  return (
    <Card className="gap-0 py-0">
      <h2 className="px-4 pt-4 pb-3 font-semibold tracking-tight">Servicios</h2>

      {services.map((service) => (
        <div
          className="flex items-center justify-between gap-3 border-t px-4 py-2.5"
          key={service._id}
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-sm">{service.name}</p>
            <p className="text-muted-foreground text-xs">
              {service.duration} min
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="font-semibold text-sm tabular-nums">
              {formatCurrency(service.price)}
            </span>

            <Button
              nativeButton={false}
              render={
                <Link
                  params={{ barbershopUuid }}
                  search={{ serviceId: service._id }}
                  to="/barbershops/$barbershopUuid/book"
                />
              }
              size="sm"
              variant="outline"
            >
              Reservar
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
};
