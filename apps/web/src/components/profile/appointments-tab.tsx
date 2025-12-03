import type { Appointment, Barbershop } from "@panabarbero/convex/schemas";
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
import {
  getAppointmentStatusBadgeVariant,
  getAppointmentStatusLabel,
} from "@/lib/appointment-utils";

interface AppointmentsTabProps {
  appointments: Appointment[];
  barbershops: Barbershop[];
}

export const AppointmentsTab: FC<AppointmentsTabProps> = ({
  appointments,
  barbershops,
}) => {
  if (appointments.length === 0 || barbershops.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-center text-muted-foreground text-sm">
        Aún no tienes citas registradas.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {appointments.map((appointment) => {
        const barbershopName = barbershops.find(
          (barbershop) => barbershop._id === appointment.barbershopId,
        )?.name;

        const disabled =
          appointment.status === "cancelled" || appointment.status === "denied";

        return (
          <Card key={appointment._id}>
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <div className="flex flex-col items-start justify-center">
                  <CardTitle className="text-base">{barbershopName}</CardTitle>
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
                  variant={getAppointmentStatusBadgeVariant(appointment.status)}
                >
                  {getAppointmentStatusLabel(appointment.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardFooter>
              <RescheduleRequestDialog
                to="barber"
                appointment={appointment}
                trigger={
                  <Button className="mt-4" disabled={disabled}>
                    Reagendar
                  </Button>
                }
              />
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
};
