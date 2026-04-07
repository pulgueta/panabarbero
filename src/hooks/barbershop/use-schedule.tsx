import type { Barbershop } from "@convex/schema";

import { getDayKeyForDate } from "@/lib/schedule-utils";

export function useSchedule(availability: Barbershop["availability"] | null) {
  const formatTimeLabel = (time?: string | null) => {
    if (!time) return null;

    const [hours, minutes] = time.split(":").map(Number);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    const date = new Date();

    date.setHours(hours, minutes, 0, 0);

    return new Intl.DateTimeFormat("es-CO", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const todaySchedule = (() => {
    if (!availability?.length) return undefined;

    const weekday = getDayKeyForDate(new Date());

    return availability.find((entry) => entry.weekDay.day === weekday);
  })();

  const AvailabilityLabel = () => {
    if (!todaySchedule || !todaySchedule.weekDay.isActive) {
      return (
        <span className="text-muted-foreground text-sm">
          Hoy no hay atención al público.
        </span>
      );
    }

    const openAt = formatTimeLabel(todaySchedule.openAt);
    const closeAt = formatTimeLabel(todaySchedule.closeAt);
    const lunchStart = formatTimeLabel(todaySchedule.lunchStart);
    const lunchEnd = formatTimeLabel(todaySchedule.lunchEnd);

    if (!openAt || !closeAt)
      return (
        <span className="text-muted-foreground text-sm">
          Horario de atención no configurado.
        </span>
      );

    const lunchLabel =
      lunchStart && lunchEnd
        ? ` • No disponible durante: ${lunchStart} - ${lunchEnd}`
        : null;

    return (
      <div className="space-y-1 text-muted-foreground text-sm [&>span]:block">
        <span>
          Horario de hoy: {openAt} - {closeAt}
        </span>
        {lunchLabel && (
          <span>
            No disponible durante: {lunchStart} - {lunchEnd}
          </span>
        )}
      </div>
    );
  };

  return {
    todaySchedule,
    AvailabilityLabel,
  };
}
