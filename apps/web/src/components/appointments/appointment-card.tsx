import type { Appointment, Barbershop } from "@panabarbero/convex/schemas";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAppointmentDataByStatus } from "@/lib/appointment-utils";
import { CancelAppointmentDialog } from "./cancel-appointment-dialog";
import { DeleteAppointmentDialog } from "./delete-appointment-dialog";
import { RescheduleRequestDialog } from "./reschedule-request-dialog";

interface AppointmentCardProps {
  appointment: Appointment;
  barbershop: Barbershop;
  isBarber: boolean;
}

export const AppointmentCard: FC<AppointmentCardProps> = ({
  appointment,
  barbershop,
  isBarber,
}) => {
  const originalDate = new Date(appointment.date);

  const dateString = new Date(originalDate).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const disableReschedule =
    appointment.status === "completed" ||
    appointment.status === "cancelled" ||
    appointment.status === "pending" ||
    appointment.status === "denied";

  const isCancelled = appointment.status === "cancelled";
  const isDenied = appointment.status === "denied";

  const showDeleteButton = isCancelled || isDenied;

  const { label, variant } = getAppointmentDataByStatus(appointment.status);

  return (
    <Card key={appointment._id}>
      <CardHeader>
        <CardTitle className="text-base">{barbershop?.name}</CardTitle>
        <CardDescription>{dateString}</CardDescription>
        {appointment.notes && (
          <CardDescription>{appointment.notes}</CardDescription>
        }
        <Badge variant={variant}>{label}</Badge>
      </CardHeader>
      <CardFooter className="flex w-full flex-col items-center gap-2 md:flex-row">
        {!appointment.proposedDate && !showDeleteButton && (
          <RescheduleRequestDialog
            to={!isBarber ? "barber" : "customer"}
            appointment={appointment}
            trigger={
              <Button disabled={disableReschedule} className="w-full md:w-auto">
                Reagendar
              </Button>
            }
          />
        )}

        {appointment.proposedDate && (
          <Button
            variant="outline"
            disabled={appointment.status === "completed"}
            className="w-full md:w-auto"
            asChild
          >
            <Link
              to="/profile/appointments/reschedule/$appointmentId"
              params={{ appointmentId: appointment._id }}
            >
              Ver solicitud
            </Link>
          </Button>
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
