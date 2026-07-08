import type { Appointment } from "@convex/schema";

/** Calendar view identifiers, persisted in the URL (`search.view`). */
export const CALENDAR_VIEWS = ["month", "week", "day", "agenda"] as const;

/** Default hours rendered in the time grid when a shop has no schedule. */
export const DEFAULT_START_HOUR = 7;
export const DEFAULT_END_HOUR = 21;

/** Pixel height of a single hour row in week/day views (DESIGN: 64–96px/hr). */
export const HOUR_HEIGHT = 72;

/** Minimum rendered height for a timed event so short services stay tappable. */
export const MIN_EVENT_HEIGHT = 22;

/** Snap granularity for drag-to-reschedule, in minutes. */
export const SNAP_MINUTES = 15;

/** Max event chips shown in a month cell before collapsing to "+N más". */
export const MAX_MONTH_CHIPS = 3;

/** Fallback service duration (minutes) when a service can't be resolved. */
export const FALLBACK_DURATION = 30;

/**
 * Status → neutral-card accent color. Event cards stay neutral; only this
 * hairline accent + the status badge carry semantic color (DESIGN §1.3, red
 * budget). The live "ahora" line is the only element that uses `--primary`.
 */
export const STATUS_ACCENT: Record<Appointment["status"], string> = {
  confirmed: "bg-success",
  pending: "bg-warning",
  rescheduled: "bg-info",
  completed: "bg-success/70",
  cancelled: "bg-destructive",
  denied: "bg-destructive",
  "no-show": "bg-destructive/60",
};
