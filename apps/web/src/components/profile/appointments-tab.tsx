/** biome-ignore-all lint/style/noNonNullAssertion: needed */
import type { Appointment } from "@panabarbero/convex/schemas";
import { Link } from "@tanstack/react-router";
import { CalendarOff } from "lucide-react";
import type { FC } from "react";

import { AppointmentCard } from "@/components/appointments/appointment-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { useBarbershopsByIds } from "@/hooks/barbershop/use-barbershop";

interface AppointmentsTabProps {
  appointments: Appointment[];
  isBarber: boolean;
}

export const AppointmentsTab: FC<AppointmentsTabProps> = ({
  appointments,
  isBarber,
}) => {
  const { data: barbershops } = useBarbershopsByIds(
    appointments.map((appointment) => appointment.barbershopId),
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {appointments.length ? (
        appointments.map((appointment) => {
          const barbershop = barbershops?.find(
            (barbershop) => barbershop?._id === appointment.barbershopId,
          );

          return (
            <AppointmentCard
              key={appointment._id}
              appointment={appointment}
              barbershop={barbershop!}
              isBarber={isBarber}
            />
          );
        })
      ) : (
        <Empty className="col-span-3">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarOff />
            </EmptyMedia>
            <EmptyTitle>No hay citas agendadas.</EmptyTitle>
            <EmptyDescription>
              Cuando agendas una cita, podrás verla aquí.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link
                to="/barbershops"
                search={{
                  city: undefined,
                  state: undefined,
                }}
              >
                Buscar barberías
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
};
