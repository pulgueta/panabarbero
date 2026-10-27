import { TZDate } from "@date-fns/tz";
import { differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale/es";

const SHOP_TIME_ZONE = "America/Bogota";
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** "ahora", "hace 5 min", "hace 2 h", "ayer", else "27 oct" (Bogotá time). */
export function formatRelativeTime(ms: number, now: number = Date.now()) {
  const delta = now - ms;
  if (delta < MINUTE) return "ahora";
  if (delta < HOUR) return `hace ${Math.floor(delta / MINUTE)} min`;

  const date = new TZDate(ms, SHOP_TIME_ZONE);
  const days = differenceInCalendarDays(new TZDate(now, SHOP_TIME_ZONE), date);
  if (days === 0) return `hace ${Math.floor(delta / HOUR)} h`;
  if (days === 1) return "ayer";
  return format(date, "d MMM", { locale: es });
}
