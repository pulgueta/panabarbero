import type { Barbershop } from "@convex/schema";

// ---------------------------------------------------------------------------
// Schedule utilities — single source of truth for client-side time logic
// ---------------------------------------------------------------------------

export type WeekdayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

/** Indexed by `Date.getDay()` (0 = Sunday). */
const DAY_MAP: readonly WeekdayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/** Returns the weekday key for a given Date or timestamp. */
export function getDayKeyForDate(date: Date | number): WeekdayKey {
  const d = date instanceof Date ? date : new Date(date);
  return DAY_MAP[d.getDay()];
}

/**
 * Parses an "HH:mm" string into total minutes since midnight.
 * Returns `null` for falsy / unparseable input.
 */
export function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;

  const [hours, minutes] = time.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return hours * 60 + minutes;
}

/** True when both times parse and `end` is strictly after `start`. */
export function isTimeRangeValid(start?: string, end?: string): boolean {
  if (!start || !end) return false;

  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);

  if (startMin === null || endMin === null) return false;

  return endMin > startMin;
}

/** Converts a timestamp to minutes since midnight using the browser's local TZ. */
export function minutesOfDay(ts: number): number {
  const date = new Date(ts);
  return date.getHours() * 60 + date.getMinutes();
}

// ---------------------------------------------------------------------------
// Composite helpers
// ---------------------------------------------------------------------------

type AvailabilityEntry = Barbershop["availability"][number];

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that a chosen timestamp falls within a schedule entry's open hours
 * and does not overlap the lunch break.
 *
 * Use this instead of inlining the same check in every dialog `onSubmit`.
 */
export function validateAppointmentTime(
  schedule: AvailabilityEntry | undefined,
  timestamp: number,
): ValidationResult {
  if (!schedule || !schedule.weekDay.isActive) {
    return {
      valid: false,
      error: "La barbería no atiende en el día seleccionado.",
    };
  }

  const selectedMinutes = minutesOfDay(timestamp);
  const openMinutes = parseTimeToMinutes(schedule.openAt);
  const closeMinutes = parseTimeToMinutes(schedule.closeAt);

  if (
    (openMinutes !== null && selectedMinutes < openMinutes) ||
    (closeMinutes !== null && selectedMinutes >= closeMinutes)
  ) {
    return {
      valid: false,
      error: "Selecciona una hora dentro del horario de atención.",
    };
  }

  const lunchStartMinutes = parseTimeToMinutes(schedule.lunchStart);
  const lunchEndMinutes = parseTimeToMinutes(schedule.lunchEnd);

  if (
    lunchStartMinutes !== null &&
    lunchEndMinutes !== null &&
    selectedMinutes >= lunchStartMinutes &&
    selectedMinutes < lunchEndMinutes
  ) {
    return {
      valid: false,
      error: "No se puede reservar una cita durante el horario seleccionado.",
    };
  }

  return { valid: true };
}

/**
 * Determines whether a barbershop is currently open based on its availability
 * schedule, accounting for lunch breaks.
 */
export function isCurrentlyOpen(
  availability: Barbershop["availability"],
): boolean {
  const now = new Date();
  const currentDayName = DAY_MAP[now.getDay()];

  const todaySchedule = availability.find(
    (day) => day.weekDay.day === currentDayName && day.weekDay.isActive,
  );

  if (!todaySchedule) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = parseTimeToMinutes(todaySchedule.openAt);
  const closeMinutes = parseTimeToMinutes(todaySchedule.closeAt);

  if (openMinutes === null || closeMinutes === null) return false;

  // Check if currently during lunch break
  if (todaySchedule.lunchStart && todaySchedule.lunchEnd) {
    const lunchStartMinutes = parseTimeToMinutes(todaySchedule.lunchStart);
    const lunchEndMinutes = parseTimeToMinutes(todaySchedule.lunchEnd);

    if (
      lunchStartMinutes !== null &&
      lunchEndMinutes !== null &&
      currentMinutes >= lunchStartMinutes &&
      currentMinutes < lunchEndMinutes
    ) {
      return false;
    }
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

/** Returns the end time string given a start "HH:MM" and a duration in minutes. */
export function addMinutesToTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
