/**
 * Native time-ago formatting powered by `Intl.RelativeTimeFormat`. Follows the
 * "largest fitting unit" approach described in
 * https://midu.dev/como-crear-un-time-ago-sin-dependencias-intl-relativeformat/ —
 * pick the coarsest unit whose threshold has been crossed and let the browser
 * handle localisation + pluralisation, so we get "hace 1 minuto" / "hace 2 horas"
 * for free without a date-fns/dayjs dependency.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const DATE_UNITS: Array<{
  unit: Intl.RelativeTimeFormatUnit;
  ms: number;
}> = [
  { unit: "year", ms: 365 * DAY },
  { unit: "month", ms: 30 * DAY },
  { unit: "week", ms: WEEK },
  { unit: "day", ms: DAY },
  { unit: "hour", ms: HOUR },
  { unit: "minute", ms: MINUTE },
  { unit: "second", ms: SECOND },
];

const relativeFormatter = new Intl.RelativeTimeFormat("es-CO", {
  numeric: "auto",
  style: "long",
});

const shortDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
});

const monthYearFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
});

/**
 * Localised, native relative time (e.g. "hace 5 minutos", "ayer", "hace 2 meses").
 * Falls back to an absolute short date for anything older than a week so the
 * label stays informative instead of decaying into "hace 42 días".
 */
export function formatRelativeTime(
  timestamp: number,
  now: number = Date.now(),
): string {
  const delta = now - timestamp;
  const absDelta = Math.abs(delta);

  if (absDelta < MINUTE) return "ahora";

  if (absDelta >= WEEK) {
    return shortDateFormatter.format(new Date(timestamp));
  }

  for (const { unit, ms } of DATE_UNITS) {
    if (absDelta >= ms) {
      // Negative value → past ("hace N"), positive → future ("dentro de N").
      const value = Math.round(-delta / ms);
      return relativeFormatter.format(value, unit);
    }
  }

  return relativeFormatter.format(0, "second");
}

/**
 * Bucket a timestamp into "Hoy"/"Ayer"/"Esta semana"/month-year section labels
 * used by the notifications tab for lightweight date grouping.
 */
export function getSectionLabel(
  timestamp: number,
  now: number = Date.now(),
): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const startOfToday = start.getTime();
  const startOfYesterday = startOfToday - DAY;
  const startOfWeek = startOfToday - 6 * DAY;

  if (timestamp >= startOfToday) return "Hoy";
  if (timestamp >= startOfYesterday) return "Ayer";
  if (timestamp >= startOfWeek) return "Esta semana";

  return monthYearFormatter.format(new Date(timestamp));
}
