import type { Appointment, Barbershop } from "@panabarbero/convex/schemas";
import type { FC } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAppointmentStatusBadgeVariant,
  getAppointmentStatusLabel,
} from "@/lib/appointment-utils";
import { RescheduleRequestDialog } from "../appointments/reschedule-request-dialog";
import { Button } from "../ui/button";

interface AppointmentsTabProps {
  appointments: Appointment[];
  barbershops: Barbershop[];
}

export const AppointmentsTab: FC<AppointmentsTabProps> = ({
  appointments,
  barbershops,
}) => {
  if (!appointments || appointments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
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

        return (
          <Card key={appointment._id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
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
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Contacto: {appointment.contactEmail} •{" "}
                {appointment.contactPhone}
              </p>
              {appointment.notes && (
                <p className="mt-2 text-sm italic text-muted-foreground">
                  “{appointment.notes}”
                </p>
              )}

              <RescheduleRequestDialog
                to="barber"
                appointment={appointment}
                trigger={<Button className="mt-4">Reagendar</Button>}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
