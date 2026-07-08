import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { FC } from "react";

import { cn } from "@/lib/utils";
import { MAX_MONTH_CHIPS, STATUS_ACCENT } from "./constants";
import { EventPopover } from "./event-popover";
import {
  getMonthGridDays,
  groupEventsByDay,
  isSameMonth,
  isToday,
  toISODate,
} from "./helpers";
import type { CalendarEvent } from "./types";

interface MonthViewProps {
  date: Date;
  events: CalendarEvent[];
  isBarber: boolean;
  onSelectDay: (day: Date) => void;
}

const WEEKDAY_LABELS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export const MonthView: FC<MonthViewProps> = ({
  date,
  events,
  isBarber,
  onSelectDay,
}) => {
  const days = getMonthGridDays(date);
  const byDay = groupEventsByDay(events);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid grid-cols-7 border-border border-b bg-muted/30">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center font-medium text-muted-foreground text-xs"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = byDay.get(toISODate(day)) ?? [];
          const shown = dayEvents.slice(0, MAX_MONTH_CHIPS);
          const hidden = dayEvents.length - shown.length;
          const outside = !isSameMonth(day, date);
          const today = isToday(day);

          return (
            <div
              key={day.getTime()}
              className={cn(
                "flex min-h-24 flex-col gap-1 border-border border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0",
                outside && "bg-muted/20",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                aria-label={format(day, "EEEE d 'de' MMMM", { locale: es })}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center self-end rounded-full text-xs tabular-nums transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  outside && "text-muted-foreground",
                  today &&
                    "bg-primary font-medium text-primary-foreground hover:bg-primary/90",
                )}
              >
                {format(day, "d")}
              </button>

              <div className="flex min-h-0 flex-col gap-1">
                {shown.map((event) => (
                  <EventPopover
                    key={event.id}
                    event={event}
                    isBarber={isBarber}
                    trigger={
                      <button
                        type="button"
                        className="flex w-full items-center gap-1.5 rounded-md bg-muted/60 py-0.5 pr-1 pl-1.5 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <span
                          className={cn(
                            "h-3 w-0.5 shrink-0 rounded-full",
                            STATUS_ACCENT[event.status],
                          )}
                        />
                        <span className="shrink-0 text-muted-foreground tabular-nums">
                          {format(event.start, "HH:mm")}
                        </span>
                        <span className="truncate font-medium">
                          {event.title}
                        </span>
                      </button>
                    }
                  />
                ))}

                {hidden > 0 ? (
                  <button
                    type="button"
                    onClick={() => onSelectDay(day)}
                    className="w-full rounded-md px-1.5 py-0.5 text-left text-muted-foreground text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    +{hidden} más
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
