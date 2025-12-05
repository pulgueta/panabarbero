import type { Appointment, Service } from "@panabarbero/convex/schemas";
import { Link } from "@tanstack/react-router";
import {
  CalendarCheckIcon,
  CalendarClockIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from "lucide-react";
import type { FC } from "react";

import { DeleteAppointmentDialog } from "@/components/appointments/delete-appointment-dialog";
import { RescheduleRequestDialog } from "@/components/appointments/reschedule-request-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAppointmentStatusBadgeVariant,
  getAppointmentStatusLabel,
} from "@/lib/appointment-utils";
import { CancelAppointmentDialog } from "../cancel-appointment-dialog";

interface AppointmentsForDateTableProps {
  appointments: Appointment[];
  services: Service[];
  isBarber: boolean;
}
export const AppointmentsForDateTable: FC<AppointmentsForDateTableProps> = ({
  appointments,
  services,
  isBarber,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-center">Hora</TableHead>
          <TableHead className="text-center">Cliente</TableHead>
          <TableHead className="text-center">Servicio</TableHead>
          <TableHead className="text-center">Notas</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          <TableHead className="text-center">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {appointments.map((appointment) => {
          const service = services?.find(
            (service) => service?._id === appointment.serviceId,
          );

          const isConfirmed = appointment.status === "confirmed";

          const showManageRescheduleLink =
            !!appointment.proposedDate && !isConfirmed;

          const isCancelledOrDenied =
            appointment.status === "cancelled" ||
            appointment.status === "denied";

          const canRequestReschedule =
            appointment.status !== "completed" && !isCancelledOrDenied;

          return (
            <TableRow key={appointment._id}>
              <TableCell className="text-center">
                {new Date(appointment.date).toLocaleTimeString("es-CO", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>
              <TableCell className="text-center font-medium">
                {appointment.customerName}
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                {service?.name}
              </TableCell>
              <TableCell className="text-center">
                {appointment.notes ?? "N/A"}
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={getAppointmentStatusBadgeVariant(appointment.status)}
                >
                  {getAppointmentStatusLabel(appointment.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <EllipsisVerticalIcon />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="max-w-64">
                    {!appointment.proposedDate && canRequestReschedule && (
                      <RescheduleRequestDialog
                        appointment={appointment}
                        to="customer"
                        trigger={
                          <DropdownMenuItem
                            className="inline-flex w-full items-center gap-x-2"
                            onSelect={(event) => event.preventDefault()}
                          >
                            <CalendarClockIcon className="size-3" />
                            Solicitar reagendamiento
                          </DropdownMenuItem>
                        }
                      />
                    )}

                    {showManageRescheduleLink && (
                      <DropdownMenuItem asChild>
                        <Link
                          to={"/profile/appointments/reschedule/$appointmentId"}
                          params={{ appointmentId: appointment._id }}
                          style={{
                            viewTransitionName: `appointment-${appointment._id}-reschedule`,
                          }}
                          className="inline-flex w-full items-center gap-x-2"
                        >
                          <CalendarCheckIcon className="size-3" />
                          Gestionar reagendamiento
                        </Link>
                      </DropdownMenuItem>
                    )}

                    {isCancelledOrDenied ? (
                      <DeleteAppointmentDialog
                        appointment={appointment}
                        trigger={
                          <DropdownMenuItem
                            className="inline-flex w-full items-center gap-x-2"
                            onSelect={(event) => event.preventDefault()}
                          >
                            <TrashIcon className="size-3 text-destructive dark:text-destructive-foreground" />
                            Eliminar
                          </DropdownMenuItem>
                        }
                      />
                    ) : (
                      <CancelAppointmentDialog
                        appointment={appointment}
                        userId={appointment.userId}
                        isBarber={isBarber}
                        trigger={
                          <DropdownMenuItem
                            className="inline-flex w-full items-center gap-x-2"
                            onSelect={(event) => event.preventDefault()}
                          >
                            <TrashIcon className="size-3 text-destructive dark:text-destructive-foreground" />
                            Cancelar
                          </DropdownMenuItem>
                        }
                      />
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
