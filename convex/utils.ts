/**
 * Normalizes a phone value to E.164 (`+<country><national>`) for Twilio/SMS.
 * Colombian national numbers (10 digits, no country code) get `+57`.
 * Values that already include `+` keep their country code.
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";

  const trimmed = phone.trim();
  const compactNoSpaces = trimmed.replace(/\s/g, "");

  if (compactNoSpaces.startsWith("+")) {
    const digits = compactNoSpaces.slice(1).replace(/\D/g, "");

    return digits ? `+${digits}` : "";
  }

  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  while (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.startsWith("57") && digits.length >= 12) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+57${digits}`;
  }

  if (digits.length >= 11) {
    return `+${digits}`;
  }

  return "";
}

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

/** Parses an "HH:mm" string into total minutes since midnight. */
export function parseTimeToMinutes(time: string): number {
  const [hh, mm] = time.split(":").map((n) => Number(n));

  if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN;

  return hh * 60 + mm;
}

/**
 * Colombia is permanently UTC-5 — no DST observed.
 * All barbershops in this app operate in this timezone.
 * Update this constant if the app ever expands to other timezones.
 */
const COLOMBIA_UTC_OFFSET_HOURS = -5;
const COLOMBIA_OFFSET_MS = COLOMBIA_UTC_OFFSET_HOURS * 60 * 60 * 1000;

/** Converts a timestamp to minutes since midnight in Colombia (UTC-5). */
export function minutesOfDay(ts: number): number {
  const d = new Date(ts);

  const utcHours = d.getUTCHours();
  const utcMinutes = d.getUTCMinutes();

  let localHours = utcHours + COLOMBIA_UTC_OFFSET_HOURS;

  if (localHours < 0) {
    localHours += 24;
  }

  return localHours * 60 + utcMinutes;
}

/**
 * Returns a YYYY-MM-DD date key for a timestamp in Colombia (UTC-5).
 * Use instead of new Date(ts).toDateString(), which uses server local time.
 */
export function toColombiaDateKey(ts: number): string {
  const d = new Date(ts + COLOMBIA_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
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
