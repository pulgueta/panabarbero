import type {
  Barbershop,
  BarbershopMember,
  BarbershopMemberWithName,
  Service,
} from "@convex/schema";
import { startOfDay } from "date-fns";
import { type FC, useMemo, useState } from "react";

import { AgendaView } from "./agenda-view";
import { CalendarHeader } from "./calendar-header";
import {
  buildDayWindows,
  getVisibleHours,
  getWeekDays,
  shiftDate,
} from "./helpers";
import { MonthView } from "./month-view";
import { TimeGrid } from "./time-grid";
import type { CalendarView } from "./types";
import { useCalendarAppointments } from "./use-calendar-appointments";

type BarberFilter = BarbershopMember["_id"] | "all";

interface AppointmentsCalendarProps {
  barbershopId: Barbershop["_id"];
  services: Service[];
  barbers: BarbershopMemberWithName[];
  /** The shop's weekly availability (`getAvailability`) for off-hours shading. */
  availability: Parameters<typeof buildDayWindows>[0];
  view: CalendarView;
  date: Date;
  /** Current viewer is a barber — drives the popover action copy. */
  isBarber: boolean;
  /** Owner/staff — may filter by barber and see every booking. */
  canManage: boolean;
  /** May create appointments (plan gate + role). */
  canCreate: boolean;
  onCreateAppointment: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
}

/**
 * The calendar shell. Owns the local barber-filter + slot-create state, builds
 * the visible range's events via `useCalendarAppointments`, and switches
 * between month / week / day / agenda surfaces. View + focus date live in the
 * URL (lifted to the route); the barber filter is transient view state.
 */
export const AppointmentsCalendar: FC<AppointmentsCalendarProps> = ({
  barbershopId,
  services,
  barbers,
  availability,
  view,
  date,
  isBarber,
  canManage,
  canCreate,
  onCreateAppointment,
  onViewChange,
  onDateChange,
}) => {
  const [barberFilter, setBarberFilter] = useState<BarberFilter>("all");

  const dayWindows = useMemo(
    () => buildDayWindows(availability),
    [availability],
  );

  const { events, isLoading } = useCalendarAppointments({
    barbershopId,
    view,
    date,
    barberFilter,
    services,
    barbers,
  });

  const days = view === "day" ? [date] : getWeekDays(date);
  const { startHour, endHour } = getVisibleHours(dayWindows, events);

  const handleSelectDay = (day: Date) => {
    onViewChange("day");
    onDateChange(day);
  };

  const handleCreateSlot = (day: Date) => {
    if (canCreate) onCreateAppointment(startOfDay(day));
  };

  const handleCreate = () => {
    if (canCreate) onCreateAppointment(startOfDay(date));
  };

  return (
    <div className="space-y-4">
      <CalendarHeader
        view={view}
        date={date}
        onViewChange={onViewChange}
        onPrev={() => onDateChange(shiftDate(view, date, -1))}
        onNext={() => onDateChange(shiftDate(view, date, 1))}
        onToday={() => onDateChange(startOfDay(new Date()))}
        barbers={barbers}
        barberFilter={barberFilter}
        onBarberFilterChange={setBarberFilter}
        showBarberFilter={canManage && barbers.length > 1}
      />

      <div aria-busy={isLoading}>
        {view === "month" ? (
          <MonthView
            date={date}
            events={events}
            isBarber={isBarber}
            onSelectDay={handleSelectDay}
          />
        ) : view === "agenda" ? (
          <AgendaView
            date={date}
            events={events}
            isBarber={isBarber}
            canCreate={canCreate}
            onCreate={handleCreate}
          />
        ) : (
          <TimeGrid
            days={days}
            events={events}
            dayWindows={dayWindows}
            startHour={startHour}
            endHour={endHour}
            isBarber={isBarber}
            canCreate={canCreate}
            onSelectDay={handleSelectDay}
            onCreateSlot={handleCreateSlot}
            showDayHeaders={view === "week"}
          />
        )}
      </div>
    </div>
  );
};
