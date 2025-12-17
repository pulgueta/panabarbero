import type {
  Barbershop,
  BarbershopMemberWithName,
  Service,
} from "@panabarbero/convex/schemas";
import { Clock } from "lucide-react";
import type { FC } from "react";

import { CreateAppointmentDialog } from "@/components/appointments/create-appointment-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/form-utils";

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
  return (
    <article
      className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      style={{
        viewTransitionName: `barbershop-${services[0].barbershopId}-services`,
      }}
    >
      {services.map((service) => (
        <Card
          key={service._id}
          className="max-h-36 transition-transform duration-500"
        >
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
              barbershopId={barbershopId}
              services={services}
              barbers={barbers}
              serviceId={service._id}
              trigger={<Button>Reservar</Button>}
            />
          </CardContent>
        </Card>
      ))}
    </article>
  );
};
