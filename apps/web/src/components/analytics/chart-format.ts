/** Shared label formatters for the analytics charts (es-CO, Bogotá months). */

const shortMonthFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "short",
  timeZone: "America/Bogota",
});

const longMonthFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  year: "numeric",
  timeZone: "America/Bogota",
});

/** Mid-month UTC noon avoids any timezone nudging the label into a neighbor month. */
function monthKeyToDate(monthKey: string): Date {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 15, 12));
}

/** "2026-06" → "jun". */
export function formatMonthShort(monthKey: string): string {
  return shortMonthFormatter.format(monthKeyToDate(monthKey));
}

/** "2026-06" → "junio de 2026". */
export function formatMonthLong(monthKey: string): string {
  return longMonthFormatter.format(monthKeyToDate(monthKey));
}

const shortDayFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  timeZone: "America/Bogota",
});

const longDayFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "long",
  timeZone: "America/Bogota",
});

/** UTC noon avoids any timezone nudging the label into a neighbor day. */
function dateKeyToDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

/** "2026-07-15" → "15 jul". */
export function formatDayShort(dateKey: string): string {
  return shortDayFormatter.format(dateKeyToDate(dateKey));
}

/** "2026-07-15" → "15 de julio de 2026". */
export function formatDayLong(dateKey: string): string {
  return longDayFormatter.format(dateKeyToDate(dateKey));
}

const AXIS_LABEL_MAX = 18;

/** Category-axis names stay one-line; the tooltip carries the full name. */
export function truncateLabel(label: string): string {
  return label.length > AXIS_LABEL_MAX
    ? `${label.slice(0, AXIS_LABEL_MAX - 1)}…`
    : label;
}
