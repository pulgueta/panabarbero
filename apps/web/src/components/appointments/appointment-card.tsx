import type { Appointment, Barbershop, Service } from "@convex/tables";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";
import { Activity } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppointmentDataByStatus } from "@/lib/appointment-utils";
import { CancelAppointmentDialog } from "./cancel-appointment-dialog";
import { DeleteAppointmentDialog } from "./delete-appointment-dialog";
import { RescheduleRequestDialog } from "./reschedule-request-dialog";
import { RescheduleResponseDialog } from "./reschedule-response-dialog";

interface AppointmentCardProps {
  appointment: Appointment;
  barbershop: Barbershop;
  isBarber: boolean;
  service: Service;
}

export const AppointmentCard: FC<AppointmentCardProps> = ({
  appointment,
  barbershop,
  isBarber,
  service,
}) => {
  const originalDate = new Date(appointment.date);

  const dateString = new Date(originalDate).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isPastDate = Date.now() > appointment.date;

  const disableReschedule =
    appointment.status === "completed" ||
    appointment.status === "cancelled" ||
    appointment.status === "pending" ||
    appointment.status === "denied" ||
    isPastDate;

  const isCancelled = appointment.status === "cancelled";
  const isDenied = appointment.status === "denied";

  const showDeleteButton = isCancelled || isDenied || isPastDate;

  const { label, variant } = getAppointmentDataByStatus(appointment.status);

  return (
    <Card className="max-h-full">
      <CardHeader>
        <Link
          to="/barbershops/$barbershopUuid"
          params={{ barbershopUuid: barbershop?.uuid }}
        >
          <CardTitle>{barbershop?.name}</CardTitle>
        </Link>
        <CardDescription>{dateString}</CardDescription>
        <Badge variant={variant}>{label}</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-pretty text-muted-foreground text-sm">
          Servicio: {service.name}
        </p>
        <p className="text-pretty text-muted-foreground text-sm">
          {appointment.notes || "No hay notas"}
        </p>
      </CardContent>
      <CardFooter className="flex w-full flex-col items-center gap-2 md:flex-row">
        <Activity
          mode={
            !appointment.proposedDate && !showDeleteButton
              ? "visible"
              : "hidden"
          }
        >
          <RescheduleRequestDialog
            to={!isBarber ? "barber" : "customer"}
            appointment={appointment}
            trigger={
              <Button
                variant="secondary"
                disabled={disableReschedule}
                className="w-full md:w-auto"
              >
                Reagendar
              </Button>
            }
          />
        </Activity>

        {appointment.proposedDate && !isPastDate && (
          <RescheduleResponseDialog
            appointment={appointment}
            viewer={isBarber ? "barber" : "customer"}
            trigger={
              <Button
                variant="outline"
                disabled={appointment.status === "completed"}
                className="w-full md:w-auto"
              >
                Ver solicitud
              </Button>
            }
          />
        )}

        {showDeleteButton ? (
          <DeleteAppointmentDialog
            appointment={appointment}
            trigger={
              <Button variant="destructive" className="w-full md:w-auto">
                Eliminar
              </Button>
            }
          />
        ) : (
          <CancelAppointmentDialog
            appointment={appointment}
            userId={appointment.userId}
            isBarber={isBarber}
            trigger={
              <Button variant="destructive" className="w-full md:w-auto">
                Cancelar
              </Button>
            }
          />
        )}
      </CardFooter>
    </Card>
  );
};
