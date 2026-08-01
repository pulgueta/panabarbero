import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { FC } from "react";

import { CancelAppointmentDialog } from "@/components/appointments/cancel-appointment-dialog";
import { DeleteAppointmentDialog } from "@/components/appointments/delete-appointment-dialog";
import { MarkAppointmentDialog } from "@/components/appointments/mark-appointment-dialog";
import { RescheduleRequestDialog } from "@/components/appointments/reschedule-request-dialog";
import { toZoned } from "@/components/calendar/calendar-lib";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { getAppointmentDataByStatus } from "@/lib/appointment-utils";

import { CALENDAR_TIME_ZONE } from "./constants";
import type { AppointmentCalendarEvent } from "./types";

interface EventPopoverProps {
  event: AppointmentCalendarEvent;
  isBarber: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: Element;
}

// The grid places events in Bogotá; format in the same zone so a viewer
// abroad does not see a different day or hour than the one they clicked.
const timeRange = (start: Date, end: Date) =>
  `${format(toZoned(start, CALENDAR_TIME_ZONE), "HH:mm")}–${format(
    toZoned(end, CALENDAR_TIME_ZONE),
    "HH:mm",
  )}`;

export const EventPopover: FC<EventPopoverProps> = ({
  event,
  isBarber,
  open,
  onOpenChange,
  anchor,
}) => {
  const { appointment, barberName, serviceName } = event.data;
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
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverContent anchor={anchor} align="start" className="gap-3">
        <header className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-sm leading-tight">{event.title}</p>
            <Badge variant={variant}>{label}</Badge>
          </div>
          <p className="text-muted-foreground text-xs capitalize">
            {format(
              toZoned(new Date(appointment.date), CALENDAR_TIME_ZONE),
              "EEEE d 'de' MMMM",
              { locale: es },
            )}
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
            <dd className="text-right">{serviceName}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Barbero</dt>
            <dd className="text-right">{barberName}</dd>
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
