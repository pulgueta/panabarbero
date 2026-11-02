import {
  DEFAULT_END_HOUR,
  DEFAULT_START_HOUR,
  FALLBACK_DURATION,
} from "./constants";
import type { AppointmentCalendarEvent, DayWindow } from "./types";

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function eventEnd(
  start: number,
  durationMinutes: number | undefined,
): number {
  return start + (durationMinutes ?? FALLBACK_DURATION) * 60_000;
}

function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseTime(value: string | undefined | null): number | null {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

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

export function getVisibleHours(
  windows: Record<number, DayWindow>,
  events: AppointmentCalendarEvent[],
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

  for (const event of events) {
    startHour = Math.min(startHour, Math.floor(minutesOfDay(event.start) / 60));
    endHour = Math.max(endHour, Math.ceil(minutesOfDay(event.end) / 60));
  }

  return {
    startHour: Math.max(0, startHour),
    endHour: Math.min(24, Math.max(endHour, startHour + 1)),
  };
}
