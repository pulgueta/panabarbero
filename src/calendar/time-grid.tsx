import { format } from "date-fns";
import { es } from "date-fns/locale";
import { type FC, useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { HOUR_HEIGHT, MIN_EVENT_HEIGHT, STATUS_ACCENT } from "./constants";
import { EventPopover } from "./event-popover";
import {
  eventsOnDay,
  isToday,
  minutesOfDay,
  packEventsForDay,
} from "./helpers";
import type { CalendarEvent, DayWindow } from "./types";

interface TimeGridProps {
  days: Date[];
  events: CalendarEvent[];
  dayWindows: Record<number, DayWindow>;
  startHour: number;
  endHour: number;
  isBarber: boolean;
  canCreate: boolean;
  /** Week-view day headers switch to that day; noop-able in day view. */
  onSelectDay: (day: Date) => void;
  onCreateSlot: (day: Date) => void;
  /** Whether to render clickable day headers (week) or a single label (day). */
  showDayHeaders: boolean;
}

const GUTTER = "w-12 sm:w-14";

/**
 * Shared time grid for week (7 days) and day (1 day) views. All geometry comes
 * from `helpers.ts`; this component only paints rows, off-hours shading, the
 * live now-line, and overlap-packed event blocks.
 */
export const TimeGrid: FC<TimeGridProps> = ({
  days,
  events,
  dayWindows,
  startHour,
  endHour,
  isBarber,
  canCreate,
  onSelectDay,
  onCreateSlot,
  showDayHeaders,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrolledRangeRef = useRef<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  const dayStartMin = startHour * 60;
  const dayEndMin = endHour * 60;
  const totalHeight = (endHour - startHour) * HOUR_HEIGHT;
  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i,
  );

  const minToTop = useCallback(
    (min: number) =>
      ((Math.min(Math.max(min, dayStartMin), dayEndMin) - dayStartMin) / 60) *
      HOUR_HEIGHT,
    [dayStartMin, dayEndMin],
  );

  // Client-only clock so the now-line never causes a hydration mismatch.
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Scroll the current time into view once per visible day range — on the
  // first clock tick and on view/date changes, never on later ticks (which
  // would yank the grid away from wherever the user scrolled).
  useEffect(() => {
    if (now === null || !scrollRef.current) return;
    const showsToday = days.some((day) => isToday(day));
    if (!showsToday) return;
    const rangeKey = days.map((day) => day.toDateString()).join("|");
    if (autoScrolledRangeRef.current === rangeKey) return;
    autoScrolledRangeRef.current = rangeKey;
    const target = minToTop(minutesOfDay(now)) - HOUR_HEIGHT * 2;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    scrollRef.current.scrollTo({
      top: Math.max(0, target),
      behavior: reduce ? "auto" : "smooth",
    });
  }, [days, minToTop, now]);

  const nowMin = now === null ? null : minutesOfDay(now);
  const showNowLine =
    nowMin !== null &&
    nowMin >= dayStartMin &&
    nowMin <= dayEndMin &&
    days.some((day) => isToday(day));

  const gridTemplate = {
    gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {/* Day headers */}
      <div className="flex border-border border-b bg-muted/30">
        <div className={cn("shrink-0", GUTTER)} />
        <div className="grid flex-1" style={gridTemplate}>
          {days.map((day) => {
            const today = isToday(day);
            const content = (
              <>
                <span className="text-muted-foreground text-xs capitalize">
                  {format(day, "EEE", { locale: es })}
                </span>
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-sm tabular-nums",
                    today && "bg-primary font-medium text-primary-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
              </>
            );
            return showDayHeaders ? (
              <button
                key={day.getTime()}
                type="button"
                onClick={() => onSelectDay(day)}
                className="flex flex-col items-center gap-0.5 border-border border-r py-2 last:border-r-0 hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {content}
              </button>
            ) : (
              <div
                key={day.getTime()}
                className="flex flex-col items-center gap-0.5 py-2"
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="max-h-[68vh] overflow-y-auto">
        <div className="flex">
          {/* Hour gutter */}
          <div
            className={cn("relative shrink-0", GUTTER)}
            style={{ height: totalHeight }}
          >
            {hours.map((hour) => (
              <div
                key={hour}
                className="absolute right-2 -translate-y-1/2 text-muted-foreground text-xs tabular-nums"
                style={{ top: (hour - startHour) * HOUR_HEIGHT }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div
            className="relative grid flex-1"
            style={{ ...gridTemplate, height: totalHeight }}
          >
            {/* Hour grid lines */}
            {hours.map((hour) => (
              <div
                key={hour}
                className="pointer-events-none absolute inset-x-0 border-border/60 border-t"
                style={{ top: (hour - startHour) * HOUR_HEIGHT }}
              />
            ))}

            {/* Now line */}
            {showNowLine && nowMin !== null ? (
              <div
                className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                style={{ top: minToTop(nowMin) }}
                aria-hidden
              >
                <span className="-ml-1 size-2 rounded-full bg-primary" />
                <span className="h-px flex-1 bg-primary" />
              </div>
            ) : null}

            {days.map((day) => {
              const window = dayWindows[day.getDay()];
              const positioned = packEventsForDay(eventsOnDay(events, day));
              const closed = !window?.isActive;

              const shades: Array<{ top: number; height: number }> = [];
              if (closed) {
                shades.push({ top: 0, height: totalHeight });
              } else {
                if (
                  window.openMinutes !== null &&
                  window.openMinutes > dayStartMin
                ) {
                  shades.push({ top: 0, height: minToTop(window.openMinutes) });
                }
                if (
                  window.closeMinutes !== null &&
                  window.closeMinutes < dayEndMin
                ) {
                  shades.push({
                    top: minToTop(window.closeMinutes),
                    height: totalHeight - minToTop(window.closeMinutes),
                  });
                }
                if (
                  window.lunchStartMinutes !== null &&
                  window.lunchEndMinutes !== null
                ) {
                  shades.push({
                    top: minToTop(window.lunchStartMinutes),
                    height:
                      minToTop(window.lunchEndMinutes) -
                      minToTop(window.lunchStartMinutes),
                  });
                }
              }

              return (
                <div
                  key={day.getTime()}
                  className="relative border-border border-r last:border-r-0"
                >
                  {/* Off-hours shading */}
                  {shades.map((shade, index) => (
                    <div
                      key={index}
                      className="pointer-events-none absolute inset-x-0 bg-muted/40"
                      style={{
                        top: shade.top,
                        height: Math.max(0, shade.height),
                      }}
                    />
                  ))}

                  {/* Click-empty-to-create layer (behind events) */}
                  {canCreate ? (
                    <button
                      type="button"
                      onClick={() => onCreateSlot(day)}
                      aria-label={`Crear cita el ${format(day, "d 'de' MMMM", { locale: es })}`}
                      className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
                    />
                  ) : null}

                  {/* Timed events */}
                  {positioned.map((event) => {
                    const top = minToTop(minutesOfDay(event.start));
                    const rawHeight =
                      ((event.end - event.start) / 3_600_000) * HOUR_HEIGHT;
                    const height = Math.max(rawHeight - 2, MIN_EVENT_HEIGHT);
                    const widthPct = 100 / event.laneCount;
                    const leftPct = (event.laneIndex * 100) / event.laneCount;

                    return (
                      <EventPopover
                        key={event.id}
                        event={event}
                        isBarber={isBarber}
                        trigger={
                          <button
                            type="button"
                            className="absolute z-10 flex overflow-hidden rounded-md border border-border bg-card text-left shadow-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                            style={{
                              top,
                              height,
                              left: `calc(${leftPct}% + 2px)`,
                              width: `calc(${widthPct}% - 4px)`,
                            }}
                          >
                            <span
                              className={cn(
                                "w-1 shrink-0",
                                STATUS_ACCENT[event.status],
                              )}
                            />
                            <span className="min-w-0 flex-1 px-1.5 py-0.5">
                              <span className="block truncate font-medium text-xs">
                                {event.title}
                              </span>
                              <span className="block truncate text-muted-foreground text-xs tabular-nums">
                                {format(event.start, "HH:mm")} ·{" "}
                                {event.serviceName}
                              </span>
                            </span>
                          </button>
                        }
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
