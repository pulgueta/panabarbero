import { format, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import type { FC } from "react";

import { Badge } from "@/components/ui/badge";
import { getAppointmentDataByStatus } from "@/lib/appointment-utils";
import { cn } from "@/lib/utils";
import { CalendarEmpty } from "./calendar-empty";
import { STATUS_ACCENT } from "./constants";
import { EventPopover } from "./event-popover";
import { groupEventsByDay, isToday } from "./helpers";
import type { CalendarEvent } from "./types";

interface AgendaViewProps {
  date: Date;
  events: CalendarEvent[];
  isBarber: boolean;
  canCreate: boolean;
  onCreate: () => void;
}

/** A month-scoped, day-grouped list — the primary mobile surface. */
export const AgendaView: FC<AgendaViewProps> = ({
  date,
  events,
  isBarber,
  canCreate,
  onCreate,
}) => {
  const monthEvents = events.filter((event) =>
    isSameMonth(new Date(event.start), date),
  );

  if (monthEvents.length === 0) {
    return (
      <div className="rounded-xl border border-border p-2">
        <CalendarEmpty
          message="No hay citas este mes"
          canCreate={canCreate}
          onCreate={onCreate}
        />
      </div>
    );
  }

  const grouped = [...groupEventsByDay(monthEvents).entries()].sort(
    ([a], [b]) => a.localeCompare(b),
  );

  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {grouped.map(([key, dayEvents]) => {
        const day = new Date(dayEvents[0].start);
        return (
          <section key={key} className="p-3">
            <h3 className="mb-2 flex items-baseline gap-2">
              <span
                className={cn(
                  "font-medium text-sm capitalize",
                  isToday(day) && "text-primary",
                )}
              >
                {format(day, "EEEE d", { locale: es })}
              </span>
              <span className="text-muted-foreground text-xs">
                {dayEvents.length} cita{dayEvents.length === 1 ? "" : "s"}
              </span>
            </h3>

            <ul className="space-y-1.5">
              {dayEvents.map((event) => {
                const { label, variant } = getAppointmentDataByStatus(
                  event.status,
                );
                return (
                  <li key={event.id}>
                    <EventPopover
                      event={event}
                      isBarber={isBarber}
                      trigger={
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <span
                            className={cn(
                              "h-8 w-0.5 shrink-0 rounded-full",
                              STATUS_ACCENT[event.status],
                            )}
                          />
                          <span className="w-12 shrink-0 text-muted-foreground text-sm tabular-nums">
                            {format(event.start, "HH:mm")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-sm">
                              {event.title}
                            </span>
                            <span className="block truncate text-muted-foreground text-xs">
                              {event.serviceName} · {event.barberName}
                            </span>
                          </span>
                          <Badge variant={variant} className="shrink-0">
                            {label}
                          </Badge>
                        </button>
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
