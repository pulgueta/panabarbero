import type { Appointment } from "@convex/schema";

import type { CalendarEvent } from "@/components/calendar/calendar-types";

import type { CALENDAR_VIEWS } from "./constants";

export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export interface AppointmentCalendarData {
  appointment: Appointment;
  barberName: string;
  serviceName: string;
}

export type AppointmentCalendarEvent = Omit<
  CalendarEvent<AppointmentCalendarData>,
  "data"
> & {
  data: AppointmentCalendarData;
};

export interface DayWindow {
  isActive: boolean;
  openMinutes: number | null;
  closeMinutes: number | null;
  lunchStartMinutes: number | null;
  lunchEndMinutes: number | null;
}
