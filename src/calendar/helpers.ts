import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";

import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  FALLBACK_DURATION,
} from "./constants";
import type {
  CalendarEvent,
  CalendarView,
  DayWindow,
  PositionedEvent,
} from "./types";

const WEEK_OPTS = { weekStartsOn: 1 } as const; // Monday-first (es-CO)

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// ---------------------------------------------------------------------------
// URL <-> Date
// ---------------------------------------------------------------------------

/** `Date` → `yyyy-MM-dd` for the `search.date` param (stable, tz-agnostic). */
export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Parse a `yyyy-MM-dd` search param into a local `Date` (falls back to today). */
export function fromISODate(value: string | undefined): Date {
  if (value) {
    const [y, m, d] = value.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  return startOfDay(new Date());
}

// ---------------------------------------------------------------------------
// Ranges & navigation
// ---------------------------------------------------------------------------

/**
 * The timestamp window the shell must fetch for a view. Month & agenda cover
 * the full 6-week grid so every visible cell has its events.
 */
export function getFetchRange(
  view: CalendarView,
  date: Date,
): { start: Date; end: Date } {
  switch (view) {
    case "day":
      return { start: startOfDay(date), end: endOfDay(date) };
    case "week":
      return {
        start: startOfWeek(date, WEEK_OPTS),
        end: endOfWeek(date, WEEK_OPTS),
      };
    default:
      return {
        start: startOfWeek(startOfMonth(date), WEEK_OPTS),
        end: endOfWeek(endOfMonth(date), WEEK_OPTS),
      };
  }
}

/** The 42 (6×7) days of a month grid, Monday-first. */
export function getMonthGridDays(date: Date): Date[] {
  const { start, end } = getFetchRange("month", date);
  return eachDayOfInterval({ start, end });
}

/** The 7 days of the week containing `date`, Monday-first. */
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, WEEK_OPTS);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Shift the focus date by one unit in the current view's direction. */
export function shiftDate(
  view: CalendarView,
  date: Date,
  direction: 1 | -1,
): Date {
  switch (view) {
    case "day":
      return addDays(date, direction);
    case "week":
      return addWeeks(date, direction);
    default:
      return addMonths(date, direction);
  }
}

/** Human title for the header, e.g. "julio de 2026" or "4 jul 2026". */
export function getRangeTitle(view: CalendarView, date: Date): string {
  if (view === "day") {
    return format(date, "EEEE d 'de' MMMM", { locale: es });
  }
  if (view === "week") {
    const days = getWeekDays(date);
    const first = days[0];
    const last = days[6];
    const sameMonth = first.getMonth() === last.getMonth();
    return sameMonth
      ? `${format(first, "d")}–${format(last, "d 'de' MMMM", { locale: es })}`
      : `${format(first, "d MMM", { locale: es })} – ${format(last, "d MMM yyyy", { locale: es })}`;
  }
  return format(date, "MMMM 'de' yyyy", { locale: es });
}

// ---------------------------------------------------------------------------
// Event building & grouping
// ---------------------------------------------------------------------------

/** End timestamp of an appointment given its service duration in minutes. */
export function eventEnd(
  start: number,
  durationMinutes: number | undefined,
): number {
  return start + (durationMinutes ?? FALLBACK_DURATION) * 60_000;
}

/** Group events by `yyyy-MM-dd`, each bucket sorted by start time. */
export function groupEventsByDay(
  events: CalendarEvent[],
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = toISODate(new Date(event.start));
    const bucket = map.get(key);
    if (bucket) bucket.push(event);
    else map.set(key, [event]);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => a.start - b.start);
  }
  return map;
}

export function eventsOnDay(
  events: CalendarEvent[],
  day: Date,
): CalendarEvent[] {
  return events
    .filter((event) => isSameDay(new Date(event.start), day))
    .sort((a, b) => a.start - b.start);
}

/**
 * Greedy interval packing → side-by-side columns for overlapping bookings
 * (e.g. two barbers at the same time). Events are grouped into clusters of
 * transitive overlap; within a cluster each event gets a lane, and every
 * event in that cluster shares the cluster's lane count so widths line up.
 */
export function packEventsForDay(events: CalendarEvent[]): PositionedEvent[] {
  const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end);
  const result: PositionedEvent[] = [];
  let cluster: Array<CalendarEvent & { laneIndex: number }> = [];
  let clusterEnd = Number.NEGATIVE_INFINITY;

  const flush = () => {
    const laneCount = cluster.reduce(
      (max, e) => Math.max(max, e.laneIndex + 1),
      0,
    );
    for (const event of cluster) result.push({ ...event, laneCount });
    cluster = [];
    clusterEnd = Number.NEGATIVE_INFINITY;
  };

  const laneEnds: number[] = [];

  for (const event of sorted) {
    if (cluster.length && event.start >= clusterEnd) {
      flush();
      laneEnds.length = 0;
    }
    let lane = laneEnds.findIndex((end) => end <= event.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(event.end);
    } else {
      laneEnds[lane] = event.end;
    }
    cluster.push({ ...event, laneIndex: lane });
    clusterEnd = Math.max(clusterEnd, event.end);
  }
  if (cluster.length) flush();

  return result;
}

// ---------------------------------------------------------------------------
// Time-grid geometry
// ---------------------------------------------------------------------------

/** Minutes since midnight for a timestamp. */
export function minutesOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  return d.getHours() * 60 + d.getMinutes();
}

/** Snap a minute value to the nearest `snap` grid line. */
export function snapMinutes(minutes: number, snap: number): number {
  return Math.round(minutes / snap) * snap;
}

/** Parse "HH:mm" → minutes since midnight, or null when malformed. */
export function parseTime(value: string | undefined | null): number | null {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Map a shop's weekly availability to per-JS-weekday windows for off-hours
 * shading. `availability` is the array returned by `getAvailability`.
 */
export function buildDayWindows(
  availability:
    | Array<{
        weekDay: { day: string; isActive: boolean };
        openAt: string;
        closeAt: string;
        lunchStart?: string;
        lunchEnd?: string;
      }>
    | undefined,
): Record<number, DayWindow> {
  const windows: Record<number, DayWindow> = {};
  for (const entry of availability ?? []) {
    const index = DAY_NAME_TO_INDEX[entry.weekDay.day];
    if (index === undefined) continue;
    windows[index] = {
      isActive: entry.weekDay.isActive,
      openMinutes: parseTime(entry.openAt),
      closeMinutes: parseTime(entry.closeAt),
      lunchStartMinutes: parseTime(entry.lunchStart),
      lunchEndMinutes: parseTime(entry.lunchEnd),
    };
  }
  return windows;
}

/**
 * Visible hour band for the time grid, derived from the widest active window
 * (clamped to the defaults) so the grid never clips a booking.
 */
export function getVisibleHours(
  windows: Record<number, DayWindow>,
  events: CalendarEvent[],
): { startHour: number; endHour: number } {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;

  for (const window of Object.values(windows)) {
    if (!window.isActive) continue;
    if (window.openMinutes !== null) {
      startHour = Math.min(startHour, Math.floor(window.openMinutes / 60));
    }
    if (window.closeMinutes !== null) {
      endHour = Math.max(endHour, Math.ceil(window.closeMinutes / 60));
    }
  }

  // Never clip an actual booking that sits outside the shop window.
  for (const event of events) {
    startHour = Math.min(startHour, Math.floor(minutesOfDay(event.start) / 60));
    endHour = Math.max(endHour, Math.ceil(minutesOfDay(event.end) / 60));
  }

  return {
    startHour: Math.max(0, startHour),
    endHour: Math.min(24, Math.max(endHour, startHour + 1)),
  };
}

export { isSameDay, isSameMonth, isToday } from "date-fns";
