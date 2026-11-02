import type { Service } from "@convex/schema";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatServicePrice } from "@/lib/utils";

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
      <h2 className="border-b p-4 font-semibold tracking-tight">Servicios</h2>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <div
            className="grid min-w-0 grid-rows-[1fr_auto] gap-3 p-4"
            key={service._id}
          >
            <div className="flex flex-col items-start justify-between gap-2 lg:flex-row lg:items-center">
              <p className="wrap-break-word font-medium text-sm leading-snug">
                {service.name}
              </p>
              <p className="text-muted-foreground text-xs">
                {service.duration} min
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-sm tabular-nums">
                {formatServicePrice(service)}
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
      </div>
    </Card>
  );
};
