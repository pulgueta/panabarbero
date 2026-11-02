import { TZDate } from "@date-fns/tz";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  getHours,
  getMinutes,
  getYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale/es";

/** Shops operate on Bogotá time (UTC-5, no DST), the same zone the backend uses for day queries. */
const SHOP_TIME_ZONE = "America/Bogota";

function inShopZone(ms: number) {
  return new TZDate(ms, SHOP_TIME_ZONE);
}

/** Epoch ms of Bogotá midnight for the day that contains `date`. */
export function bogotaStartOfDay(date: Date): number {
  return startOfDay(inShopZone(date.getTime())).getTime();
}

/** Bogotá midnight `amount` days after `dayMs`. */
export function addDaysBogota(dayMs: number, amount: number): number {
  return addDays(inShopZone(dayMs), amount).getTime();
}

/** "lun 27 oct" */
export function formatDayLabel(ms: number): string {
  return format(inShopZone(ms), "EEE d MMM", { locale: es });
}

/** "lun" */
export function formatWeekday(ms: number): string {
  return format(inShopZone(ms), "EEE", { locale: es });
}

/** "L", "M", "X", "J", "V", "S", "D" for narrow column headers. */
export function formatWeekdayLetter(ms: number): string {
  return format(inShopZone(ms), "EEEEE", { locale: es }).toUpperCase();
}

/** "27" */
export function formatDayOfMonth(ms: number): string {
  return format(inShopZone(ms), "d");
}

/** 24-hour "10:30", denser than the 12-hour format. */
export function formatTime(ms: number): string {
  return format(inShopZone(ms), "HH:mm");
}

/** "lun 27 oct · 10:30" */
export function formatDayTime(ms: number): string {
  return `${formatDayLabel(ms)} · ${formatTime(ms)}`;
}

/** Minutes since Bogotá midnight, for a position on the day timeline. */
export function bogotaMinutesOfDay(ms: number): number {
  const date = inShopZone(ms);
  return getHours(date) * 60 + getMinutes(date);
}

/** "08:00" for a timeline hour label. */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** "Noviembre 2026" */
export function formatMonthTitle(monthMs: number): string {
  const title = format(inShopZone(monthMs), "MMMM yyyy", { locale: es });
  return title.charAt(0).toUpperCase() + title.slice(1);
}

/** "ene" … "dic" for the month picker. */
export function formatMonthShort(monthMs: number): string {
  return format(inShopZone(monthMs), "LLL", { locale: es });
}

/** Bogotá midnight of the first day of the month that contains `ms`. */
export function bogotaStartOfMonth(ms: number): number {
  return startOfMonth(inShopZone(ms)).getTime();
}

/** Bogotá midnight of the last day of the month that contains `ms`. */
export function bogotaEndOfMonth(ms: number): number {
  return startOfDay(endOfMonth(inShopZone(ms))).getTime();
}

/** Bogotá midnight of the first day, `amount` months after `monthMs`. */
export function addMonthsBogota(monthMs: number, amount: number): number {
  return startOfMonth(addMonths(inShopZone(monthMs), amount)).getTime();
}

/** Monday-first weeks (as Bogotá midnights) that cover the month of `monthMs`. */
export function monthWeeks(monthMs: number): number[][] {
  const month = inShopZone(monthMs);
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  }).map((day) => startOfDay(inShopZone(day.getTime())).getTime());
  const weeks: number[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }
  return weeks;
}

/** The Monday-first week (as Bogotá midnights) that contains `dayMs`. */
export function weekDays(dayMs: number): number[] {
  const monday = startOfWeek(inShopZone(dayMs), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) =>
    addDays(monday, index).getTime(),
  );
}

/** Always 42 Bogotá midnights (6 Monday-first weeks) from the first grid cell of the month. */
export function monthGrid(monthMs: number): number[] {
  const first = monthWeeks(monthMs)[0][0];
  return Array.from({ length: 42 }, (_, index) => addDaysBogota(first, index));
}

/** Calendar year of `ms` in Bogotá. */
export function bogotaYear(ms: number): number {
  return getYear(inShopZone(ms));
}

/** Bogotá midnight of the first day of `monthIndex` (0–11) in `year`. */
export function bogotaMonth(year: number, monthIndex: number): number {
  return new TZDate(year, monthIndex, 1, SHOP_TIME_ZONE).getTime();
}

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

/** Backend weekday key ("monday" …) of the Bogotá day that contains `ms`. */
export function bogotaWeekdayKey(ms: number): WeekdayKey {
  return WEEKDAY_KEYS[getDay(inShopZone(ms))];
}
