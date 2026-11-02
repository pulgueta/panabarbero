import type { Appointment } from "@convex/schema";

export const CALENDAR_VIEWS = ["month", "week", "day", "agenda"] as const;

export const CALENDAR_TIME_ZONE = "America/Bogota";
export const CALENDAR_AGENDA_DAY_COUNT = 30;
export const CALENDAR_DEFAULT_DAY_COUNT = 5;

export const DEFAULT_START_HOUR = 7;
export const DEFAULT_END_HOUR = 21;
export const FALLBACK_DURATION = 30;

export const STATUS_COLOR: Record<Appointment["status"], string> = {
  confirmed: "var(--color-success)",
  pending: "var(--color-warning)",
  rescheduled: "var(--color-info)",
  completed: "var(--color-success)",
  cancelled: "var(--color-destructive)",
  denied: "var(--color-destructive)",
  "no-show": "var(--color-destructive)",
};
