import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { FC, ReactElement } from "react";

import { CancelAppointmentDialog } from "@/components/appointments/cancel-appointment-dialog";
import { DeleteAppointmentDialog } from "@/components/appointments/delete-appointment-dialog";
import { MarkAppointmentDialog } from "@/components/appointments/mark-appointment-dialog";
import { RescheduleRequestDialog } from "@/components/appointments/reschedule-request-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getAppointmentDataByStatus } from "@/lib/appointment-utils";
import type { CalendarEvent } from "./types";

interface EventPopoverProps {
  event: CalendarEvent;
  /** Whether the current viewer is a barber (drives cancel-dialog copy). */
  isBarber: boolean;
  /** The button that anchors the popover — an event chip or timed block. */
  trigger: ReactElement;
}

const timeRange = (start: number, end: number) =>
  `${format(start, "HH:mm")}–${format(end, "HH:mm")}`;

/**
 * Glanceable detail for a booking, anchored to its calendar block. A popover
 * (not a modal) so it can safely launch the existing action dialogs without
 * the modal-opens-modal anti-pattern (DESIGN §9). Action gating mirrors the
 * table's `AppointmentActionsCell` so behaviour is identical across surfaces.
 */
export const EventPopover: FC<EventPopoverProps> = ({
  event,
  isBarber,
  trigger,
}) => {
  const { appointment } = event;
  const status = appointment.status;
  const { label, variant } = getAppointmentDataByStatus(status);

  const isPastDate = Date.now() > appointment.date;
  const isCancelledOrDenied = status === "cancelled" || status === "denied";
  const hasSetStatus = status === "completed" || status === "no-show";
  const canRequestReschedule =
    status !== "completed" &&
    !isCancelledOrDenied &&
    !isPastDate &&
    status !== "no-show" &&
    !appointment.proposedDate;
  const showDeleteDialog =
    isCancelledOrDenied || isPastDate || status === "no-show";
  const needsMark = isPastDate && !hasSetStatus;

  return (
    <Popover>
      <PopoverTrigger render={trigger} />
      <PopoverContent align="start" className="gap-3">
        <header className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm leading-tight">{event.title}</p>
            <Badge variant={variant}>{label}</Badge>
          </div>
          <p className="text-muted-foreground text-xs capitalize">
            {format(appointment.date, "EEEE d 'de' MMMM", { locale: es })}
          </p>
        </header>

        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Hora</dt>
            <dd className="tabular-nums">
              {timeRange(event.start, event.end)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Servicio</dt>
            <dd className="text-right">{event.serviceName}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Barbero</dt>
            <dd className="text-right">{event.barberName}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Teléfono</dt>
            <dd className="tabular-nums">{appointment.contactPhone}</dd>
          </div>
          {appointment.notes ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Notas</dt>
              <dd className="max-w-40 text-pretty text-right">
                {appointment.notes}
              </dd>
            </div>
          ) : null}
        </dl>

        {status === "completed" ? (
          <p className="text-muted-foreground text-xs">Sin acciones</p>
        ) : (
          <div className="flex flex-col gap-2">
            {canRequestReschedule ? (
              <RescheduleRequestDialog
                appointment={appointment}
                to="customer"
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    Solicitar reagendamiento
                  </Button>
                }
              />
            ) : null}

            {needsMark ? (
              <MarkAppointmentDialog
                appointment={appointment}
                trigger={
                  <Button variant="outline" size="sm" className="w-full">
                    Marcar cita
                  </Button>
                }
              />
            ) : showDeleteDialog ? (
              <DeleteAppointmentDialog
                appointment={appointment}
                trigger={
                  <Button variant="destructive" size="sm" className="w-full">
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
                  <Button variant="destructive" size="sm" className="w-full">
                    Cancelar
                  </Button>
                }
              />
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
