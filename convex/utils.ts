export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";

  let formatted = phone.replace(/\s/g, "");

  if (formatted.startsWith("+57")) {
    formatted = formatted.slice(3);
  }

  if (formatted.startsWith("0")) {
    formatted = formatted.slice(1);
  }

  return formatted;
}

// ---------------------------------------------------------------------------
// Schedule utilities — single source of truth for server-side time logic
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
export const DAY_MAP: readonly WeekdayKey[] = [
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

/** Parses an "HH:mm" string into total minutes since midnight. */
export function parseTimeToMinutes(time: string): number {
  const [hh, mm] = time.split(":").map((n) => Number(n));

  if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN;

  return hh * 60 + mm;
}

/**
 * Converts a timestamp to minutes since midnight in Colombia (UTC-5).
 *
 * The offset is hardcoded because all barbershops operate in Colombia.
 */
export function minutesOfDay(ts: number): number {
  const d = new Date(ts);

  const utcHours = d.getUTCHours();
  const utcMinutes = d.getUTCMinutes();

  let localHours = utcHours - 5;

  if (localHours < 0) {
    localHours += 24;
  }

  return localHours * 60 + utcMinutes;
}

/** Checks whether an appointment time range fits within open hours. */
export function withinOpenHours(
  openAt: string | undefined,
  closeAt: string | undefined,
  startAt: number,
  endAt: number,
): boolean {
  if (!openAt || !closeAt) return true;

  const openMin = parseTimeToMinutes(openAt);
  const closeMin = parseTimeToMinutes(closeAt);

  if (Number.isNaN(openMin) || Number.isNaN(closeMin)) return true;

  const startMin = minutesOfDay(startAt);
  const endMin = minutesOfDay(endAt);

  const overnight = closeMin <= openMin;

  if (!overnight) {
    return startMin >= openMin && endMin <= closeMin;
  }

  const adjust = (m: number) => (m < openMin ? m + 1440 : m);

  const adjStart = adjust(startMin);
  const adjEnd = adjust(endMin);

  return adjStart >= openMin && adjEnd <= closeMin + 1440;
}

/** Checks whether an appointment time range overlaps a lunch break. */
export function overlapsLunchBreak(
  lunchStart: string | undefined,
  lunchEnd: string | undefined,
  startAt: number,
  endAt: number,
): boolean {
  if (!lunchStart || !lunchEnd) return false;

  const lunchStartMin = parseTimeToMinutes(lunchStart);
  const lunchEndMin = parseTimeToMinutes(lunchEnd);

  if (Number.isNaN(lunchStartMin) || Number.isNaN(lunchEndMin)) return false;

  const startMin = minutesOfDay(startAt);
  const endMin = minutesOfDay(endAt);

  return startMin < lunchEndMin && endMin > lunchStartMin;
}
