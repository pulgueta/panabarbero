import type {
  Barbershop,
  BarbershopMember,
  BarbershopMemberWithName,
  Service,
} from "@convex/schema";
import { format, isSameMonth, isSameYear, subMilliseconds } from "date-fns";
import { es } from "date-fns/locale";
import {
  type FC,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  type CalendarRenderEventProps,
  Calendar as ReuiCalendar,
} from "@/components/calendar/calendar";
import { CalendarContent } from "@/components/calendar/calendar-content";
import type { CalendarI18nOverrides } from "@/components/calendar/calendar-i18n";
import { toZoned } from "@/components/calendar/calendar-lib";
import {
  CalendarNav,
  CalendarToolbar,
} from "@/components/calendar/calendar-nav";
import type {
  CalendarOccurrence,
  CalendarSlotDraft,
  CalendarSlotInfo,
  CalendarView as ReuiCalendarView,
} from "@/components/calendar/calendar-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startOfDay } from "@/lib/utils";

import {
  CALENDAR_AGENDA_DAY_COUNT,
  CALENDAR_DEFAULT_DAY_COUNT,
  CALENDAR_TIME_ZONE,
  CALENDAR_VIEWS,
} from "./constants";
import { EventPopover } from "./event-popover";
import { buildDayWindows, getVisibleHours } from "./helpers";
import type { AppointmentCalendarData, CalendarView, DayWindow } from "./types";
import { useCalendarAppointments } from "./use-calendar-appointments";

type BarberFilter = BarbershopMember["_id"] | "all";

interface AppointmentsCalendarProps {
  barbershopId: Barbershop["_id"];
  services: Service[];
  barbers: BarbershopMemberWithName[];
  availability: Parameters<typeof buildDayWindows>[0];
  view: CalendarView;
  date: Date;
  isBarber: boolean;
  canManage: boolean;
  canCreate: boolean;
  onCreateAppointment: (date: Date) => void;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
}

const APPOINTMENT_CALENDAR_VIEWS: ReuiCalendarView[] = [...CALENDAR_VIEWS];

const CALENDAR_I18N: CalendarI18nOverrides = {
  labels: {
    today: "Hoy",
    previous: "Periodo anterior",
    next: "Periodo siguiente",
    addEvent: "Añadir cita",
    allDay: "Todo el día",
    more: (count) => `+${count} más`,
    noEvents: "No hay citas",
    loading: "Cargando citas",
    event: "cita",
    events: (count) => (count === 1 ? "1 cita" : `${count} citas`),
    selectView: "Seleccionar vista",
    week: (weekNumber) => `S${weekNumber}`,
    resources: "Barberos",
    goToDate: "Ir a una fecha",
    dropNotAllowed: "No se puede ubicar aquí",
    continues: "continúa",
    timeFrom: (time) => `Desde ${time}`,
    timeUntil: (time) => `Hasta ${time}`,
    viewShortcuts: {
      month: "M",
      week: "S",
      day: "D",
      days: "5",
      agenda: "A",
      resource: "R",
    },
    toggleDayEvents: (count, expanded) =>
      `${expanded ? "Ocultar" : "Mostrar"} ${count === 1 ? "1 cita" : `${count} citas`}`,
    eventDetails: (title) => `Detalles de ${title}`,
    moreCompact: (count) => `+${count}`,
    timeRange: (from, to) => `${from}–${to}`,
  },
  viewNames: {
    month: "Mes",
    week: "Semana",
    day: "Día",
    days: (count) => (count === 1 ? "1 día" : `${count} días`),
    agenda: "Agenda",
    resource: "Barberos",
  },
  formats: {
    monthTitle: "MMMM 'de' yyyy",
    dayTitle: "EEEE d 'de' MMMM 'de' yyyy",
    monthDayHeader: "EEE",
    monthDayHeaderNarrow: "EEEEE",
    timeGridDayHeader: "EEE d",
    // The agenda header renders the weekday in its own span, so this covers
    // only the date half.
    agendaDayHeader: "d 'de' MMMM 'de' yyyy",
    agendaDayNumber: "d",
    agendaWeekday: "EEE",
    moreDayHeader: "EEEE d 'de' MMMM",
    monthCellAriaLabel: "EEEE d 'de' MMMM 'de' yyyy",
    dayAria: "EEEE d 'de' MMMM 'de' yyyy",
    timeGutter: "HH:mm",
    timeGutterMinute: "HH:mm",
    eventTime: "HH:mm",
    monthCellDay: "d",
  },
  functions: {
    formatTitle: (view, { date, activeRange }) => {
      if (view === "month") {
        return format(date, "MMMM 'de' yyyy", { locale: es });
      }
      if (view === "day" || view === "resource") {
        return format(date, "EEEE d 'de' MMMM 'de' yyyy", { locale: es });
      }
      return formatCalendarRange(activeRange.start, activeRange.end);
    },
    formatDayRange: (range) => formatCalendarRange(range.start, range.end),
    formatEventTime: (start, end, allDay) =>
      allDay
        ? "Todo el día"
        : `${format(start, "HH:mm")}–${format(end, "HH:mm")}`,
    formatEventLabel: (title, timeLabel) => `${title}, ${timeLabel}`,
    formatEventAriaLabel: (title, timeLabel, continues) =>
      `${title}, ${timeLabel}${continues ? ", continúa" : ""}`,
  },
};

const CALENDAR_CLASS_NAMES = {
  title: "capitalize",
  timeGrid: "[--ec-hour-height:4.5rem]",
} as const;

function formatCalendarRange(start: Date, exclusiveEnd: Date): string {
  const end = subMilliseconds(exclusiveEnd, 1);

  if (isSameMonth(start, end)) {
    return `${format(start, "d")}–${format(end, "d 'de' MMMM 'de' yyyy", {
      locale: es,
    })}`;
  }

  if (isSameYear(start, end)) {
    return `${format(start, "d 'de' MMMM", { locale: es })} – ${format(
      end,
      "d 'de' MMMM 'de' yyyy",
      { locale: es },
    )}`;
  }

  return `${format(start, "d 'de' MMMM 'de' yyyy", {
    locale: es,
  })} – ${format(end, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
}

function isAppointmentCalendarView(
  view: ReuiCalendarView,
): view is CalendarView {
  return CALENDAR_VIEWS.includes(view as CalendarView);
}

function renderAppointmentEvent({
  occurrence,
  view,
}: CalendarRenderEventProps<AppointmentCalendarData>) {
  const data = occurrence.event.data;

  return (
    <>
      <span className="min-w-0 flex-1 truncate font-medium">
        {occurrence.event.title}
      </span>
      {view === "month" ? (
        <span className="shrink-0 text-muted-foreground tabular-nums">
          {format(toZoned(occurrence.start, CALENDAR_TIME_ZONE), "HH:mm")}
        </span>
      ) : data ? (
        <span className="@[8rem]:inline hidden min-w-0 truncate text-muted-foreground">
          {data.serviceName}
        </span>
      ) : null}
    </>
  );
}

function renderAppointmentAgendaEvent({
  occurrence,
}: CalendarRenderEventProps<AppointmentCalendarData>) {
  const data = occurrence.event.data;

  return (
    <>
      <span className="min-w-0 flex-1 truncate font-medium">
        {occurrence.event.title}
      </span>
      {data ? (
        <span className="min-w-0 truncate text-muted-foreground">
          {data.serviceName} · {data.barberName}
        </span>
      ) : null}
    </>
  );
}

function renderAvailabilityBackground(
  window: DayWindow | undefined,
  boundsStartMin: number,
  boundsEndMin: number,
  totalMinutes: number,
) {
  const shades: Array<{ start: number; end: number }> = [];
  const addShade = (start: number, end: number) => {
    const clippedStart = Math.max(start, boundsStartMin);
    const clippedEnd = Math.min(end, boundsEndMin);
    if (clippedEnd > clippedStart) {
      shades.push({ start: clippedStart, end: clippedEnd });
    }
  };

  if (!window?.isActive) {
    addShade(boundsStartMin, boundsEndMin);
  } else {
    if (window.openMinutes !== null) {
      addShade(boundsStartMin, window.openMinutes);
    }
    if (window.closeMinutes !== null) {
      addShade(window.closeMinutes, boundsEndMin);
    }
    if (window.lunchStartMinutes !== null && window.lunchEndMinutes !== null) {
      addShade(window.lunchStartMinutes, window.lunchEndMinutes);
    }
  }

  return shades.map(({ start, end }) => (
    <span
      key={`${start}-${end}`}
      aria-hidden
      className="absolute inset-x-0 bg-muted/40"
      style={{
        top: `${((start - boundsStartMin) / totalMinutes) * 100}%`,
        height: `${((end - start) / totalMinutes) * 100}%`,
      }}
    />
  ));
}

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
  const [details, setDetails] = useState<{
    eventId: string;
    anchor: HTMLElement;
  } | null>(null);

  const dayWindows = useMemo(
    () => buildDayWindows(availability),
    [availability],
  );
  const interactions = useMemo(
    () => ({ drag: false, resize: false, selectSlot: canCreate }),
    [canCreate],
  );

  const { events, isLoading } = useCalendarAppointments({
    barbershopId,
    view,
    date,
    barberFilter,
    services,
    barbers,
  });

  const { startHour, endHour } = getVisibleHours(dayWindows, events);
  const selectedEvent = details
    ? events.find((event) => event.id === details.eventId)
    : undefined;
  const showBarberFilter = canManage && barbers.length > 1;

  const handleEventClick = useCallback(
    (
      occurrence: CalendarOccurrence<AppointmentCalendarData>,
      event: ReactMouseEvent,
    ) => {
      event.preventDefault();
      if (!occurrence.event.data) return;
      setDetails({
        eventId: occurrence.event.id,
        anchor: event.currentTarget as HTMLElement,
      });
    },
    [],
  );

  // A month cell click navigates into the day; a timed slot click creates an
  // appointment, passing only the day because the form picks its own hour.
  const handleSlotClick = useCallback(
    (slot: CalendarSlotInfo) => {
      if (slot.view === "month") {
        setDetails(null);
        onDateChange(slot.date);
        onViewChange("day");
        return;
      }

      if (!canCreate) return;
      setDetails(null);
      onCreateAppointment(startOfDay(slot.date));
    },
    [canCreate, onCreateAppointment, onDateChange, onViewChange],
  );

  const handleSelectSlot = useCallback(
    (slot: CalendarSlotDraft) => {
      if (!canCreate) return;
      setDetails(null);
      onCreateAppointment(startOfDay(slot.start));
    },
    [canCreate, onCreateAppointment],
  );

  return (
    <>
      <ReuiCalendar<AppointmentCalendarData>
        events={events}
        view={view}
        date={date}
        views={APPOINTMENT_CALENDAR_VIEWS}
        interactions={interactions}
        loading={isLoading}
        timeZone={CALENDAR_TIME_ZONE}
        locale={es}
        weekStartsOn={1}
        dayStartHour={startHour}
        dayEndHour={endHour}
        defaultDayCount={CALENDAR_DEFAULT_DAY_COUNT}
        agendaDayCount={CALENDAR_AGENDA_DAY_COUNT}
        scrollToHour={startHour}
        showDayAddButton={canCreate}
        // No key handler is wired, so the keycap hints would advertise
        // shortcuts that do nothing.
        enableShortcuts={false}
        eventTooltip={{ side: "top", delay: 400 }}
        i18n={CALENDAR_I18N}
        classNames={CALENDAR_CLASS_NAMES}
        className="h-[70vh] max-h-[56rem] min-h-[32rem] w-full max-w-full overflow-hidden rounded-xl border border-border bg-card"
        aria-busy={isLoading}
        onEventClick={handleEventClick}
        onSlotClick={handleSlotClick}
        onSelectSlot={handleSelectSlot}
        onViewChange={(nextView) => {
          setDetails(null);
          if (isAppointmentCalendarView(nextView)) {
            onViewChange(nextView);
          }
        }}
        onDateChange={(nextDate) => {
          setDetails(null);
          onDateChange(nextDate);
        }}
        renderEvent={renderAppointmentEvent}
        renderAgendaEvent={renderAppointmentAgendaEvent}
        renderEventTooltip={({ occurrence }) => {
          const data = occurrence.event.data;
          return data ? (
            <div className="space-y-0.5">
              <p className="font-medium">{occurrence.event.title}</p>
              <p className="text-muted-foreground">
                {data.serviceName} · {data.barberName}
              </p>
            </div>
          ) : null;
        }}
        renderDayColumnBackground={({
          day,
          boundsStartMin,
          boundsEndMin,
          totalMinutes,
        }) =>
          renderAvailabilityBackground(
            dayWindows[day.getDay()],
            boundsStartMin,
            boundsEndMin,
            totalMinutes,
          )
        }
      >
        <CalendarNav />
        {showBarberFilter ? (
          <CalendarToolbar className="justify-end px-2 pb-2">
            <Select<BarberFilter>
              value={barberFilter}
              onValueChange={(value) => setBarberFilter(value ?? "all")}
            >
              <SelectTrigger size="sm" className="w-48">
                <SelectValue>
                  {(value) =>
                    value === "all"
                      ? "Todos los barberos"
                      : (barbers.find((barber) => barber._id === value)?.name ??
                        "Todos los barberos")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los barberos</SelectItem>
                {barbers.map((barber) => (
                  <SelectItem key={barber._id} value={barber._id}>
                    {barber.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CalendarToolbar>
        ) : null}
        <CalendarContent />
      </ReuiCalendar>

      {details && selectedEvent && details.anchor.isConnected ? (
        <EventPopover
          event={selectedEvent}
          isBarber={isBarber}
          open
          anchor={details.anchor}
          onOpenChange={(open) => {
            if (!open) setDetails(null);
          }}
        />
      ) : null}
    </>
  );
};
