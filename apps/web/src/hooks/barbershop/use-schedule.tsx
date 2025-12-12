import type { Barbershop } from "@panabarbero/convex/schemas";

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

    const weekday = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][new Date().getDay()];

    return availability.find((entry) => entry.weekDay.day === weekday);
  })();

  const AvailabilityLabel = () => {
    if (!todaySchedule || !todaySchedule.weekDay.isActive) {
      return "Hoy no hay atención al público.";
    }

    const openAt = formatTimeLabel(todaySchedule.openAt);
    const closeAt = formatTimeLabel(todaySchedule.closeAt);
    const lunchStart = formatTimeLabel(todaySchedule.lunchStart);
    const lunchEnd = formatTimeLabel(todaySchedule.lunchEnd);

    if (!openAt || !closeAt) return "Horario de atención no configurado.";

    const lunchLabel =
      lunchStart && lunchEnd
        ? ` • No disponible durante: ${lunchStart} - ${lunchEnd}`
        : null;

    return (
      <>
        <span>
          Horario de hoy: {openAt} - {closeAt}
        </span>
        {lunchLabel && (
          <span>
            <br />
            No disponible durante: {lunchStart} - {lunchEnd}
          </span>
        )}
      </>
    );
  };

  return {
    todaySchedule,
    AvailabilityLabel,
  };
}
