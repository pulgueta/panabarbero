import type { Appointment } from "@panabarbero/convex/schemas";
import { Link } from "@tanstack/react-router";
import { CalendarIcon } from "lucide-react";
import type { FC } from "react";

import { RescheduleRequestDialog } from "@/components/appointments/reschedule-request-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useBarbershopsByIds } from "@/hooks/barbershop/use-barbershop";
import {
  getAppointmentStatusBadgeVariant,
  getAppointmentStatusLabel,
} from "@/lib/appointment-utils";

interface AppointmentsTabProps {
  appointments: Appointment[];
}

export const AppointmentsTab: FC<AppointmentsTabProps> = ({ appointments }) => {
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

          const disabled =
            appointment.status === "cancelled" ||
            appointment.status === "denied";

          return (
            <Card key={appointment._id}>
              <CardHeader>
                <div className="flex flex-row items-center justify-between">
                  <div className="flex flex-col items-start justify-center">
                    <CardTitle className="text-base">
                      {barbershop?.name}
                    </CardTitle>
                    <CardDescription>
                      {new Date(appointment.date).toLocaleDateString("es-CO", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </CardDescription>
                  </div>

                  <Badge
                    variant={getAppointmentStatusBadgeVariant(
                      appointment.status,
                    )}
                  >
                    {getAppointmentStatusLabel(appointment.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardFooter className="gap-4">
                <RescheduleRequestDialog
                  to="barber"
                  appointment={appointment}
                  trigger={<Button disabled={disabled}>Reagendar</Button>}
                />

                {appointment.proposedDate ? (
                  <Button
                    variant="link"
                    disabled={disabled}
                    className="text-muted-foreground"
                    asChild
                  >
                    <Link
                      to="/profile/appointments/reschedule/$appointmentId"
                      params={{ appointmentId: appointment._id }}
                    >
                      Ver solicitud
                    </Link>
                  </Button>
                ) : null}
              </CardFooter>
            </Card>
          );
        })
      ) : (
        <div className="col-span-full flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center">
          <CalendarIcon className="size-6" />
          <p className="text-center text-muted-foreground text-xs md:text-sm">
            Aún no hay citas agendadas.
          </p>
        </div>
      )}
    </div>
  );
};
