import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfDay } from "date-fns";
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

/** "27" */
export function formatDayOfMonth(ms: number): string {
  return format(inShopZone(ms), "d");
}

/** 24-hour "10:30", denser than the 12-hour format. */
export function formatTime(ms: number): string {
  return format(inShopZone(ms), "HH:mm");
}
