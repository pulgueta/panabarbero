import type { Appointment } from "@convex/schema";

import type { CALENDAR_VIEWS } from "./constants";

export type CalendarView = (typeof CALENDAR_VIEWS)[number];

/**
 * A booking normalized for layout. Built once by the shell from the raw
 * appointment plus the resolved service (duration → `end`) and barber name.
 */
export interface CalendarEvent {
  id: Appointment["_id"];
  /** Customer name — the primary label on every surface. */
  title: string;
  /** Start timestamp (ms). */
  start: number;
  /** End timestamp (ms), derived from the service duration. */
  end: number;
  status: Appointment["status"];
  barberId: Appointment["barbershopMemberId"];
  barberName: string;
  serviceName: string;
  /** The untouched appointment, passed straight to the reused action dialogs. */
  appointment: Appointment;
}

/** A `CalendarEvent` after greedy interval packing for a single day column. */
export interface PositionedEvent extends CalendarEvent {
  /** 0-based column within its overlap cluster. */
  laneIndex: number;
  /** Total columns in the cluster (event width = 1 / laneCount). */
  laneCount: number;
}

/** Per-weekday working window used to shade off-hours in the time grid. */
export interface DayWindow {
  isActive: boolean;
  openMinutes: number | null;
  closeMinutes: number | null;
  lunchStartMinutes: number | null;
  lunchEndMinutes: number | null;
}
