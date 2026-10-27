import { api } from "@convex/_generated/api";
import type {
  Barbershop,
  BarbershopMember,
  BarbershopMemberWithName,
  Service,
} from "@convex/schema";
import { convexQuery } from "@convex-dev/react-query";
import { useQueries } from "@tanstack/react-query";
import { eachDayOfInterval, startOfDay, subMilliseconds } from "date-fns";
import { useMemo } from "react";

import {
  getViewDateRange,
  zonedStartOfDay,
} from "@/components/calendar/calendar-lib";
import {
  appointmentItemsDuration,
  appointmentItemsLabel,
} from "@/lib/appointment-utils";

import {
  CALENDAR_AGENDA_DAY_COUNT,
  CALENDAR_DEFAULT_DAY_COUNT,
  CALENDAR_TIME_ZONE,
  STATUS_COLOR,
} from "./constants";
import { eventEnd } from "./helpers";
import type { AppointmentCalendarEvent, CalendarView } from "./types";

export function calendarDayQueryOptions(
  barbershopId: Barbershop["_id"],
  dayMs: number,
) {
  return convexQuery(api.appointments.getByBarbershopId, {
    id: barbershopId,
    date: dayMs,
  });
}

export function getCalendarDayTimestamp(date: Date): number {
  return zonedStartOfDay(date, CALENDAR_TIME_ZONE).getTime();
}

export function getRangeDayTimestamps(
  view: CalendarView,
  date: Date,
): number[] {
  const { visibleRange } = getViewDateRange(view, date, {
    timeZone: CALENDAR_TIME_ZONE,
    weekStartsOn: 1,
    dayCount: CALENDAR_DEFAULT_DAY_COUNT,
    agendaDayCount: CALENDAR_AGENDA_DAY_COUNT,
    fixedWeeks: true,
  });

  return eachDayOfInterval({
    start: visibleRange.start,
    end: subMilliseconds(visibleRange.end, 1),
  }).map((day) => startOfDay(day).getTime());
}

interface UseCalendarAppointmentsOptions {
  barbershopId: Barbershop["_id"];
  view: CalendarView;
  date: Date;
  barberFilter: BarbershopMember["_id"] | "all";
  services: Service[];
  barbers: BarbershopMemberWithName[];
}

export function useCalendarAppointments({
  barbershopId,
  view,
  date,
  barberFilter,
  services,
  barbers,
}: UseCalendarAppointmentsOptions): {
  events: AppointmentCalendarEvent[];
  isLoading: boolean;
} {
  const dayTimestamps = useMemo(
    () => getRangeDayTimestamps(view, date),
    [view, date],
  );

  const serviceMap = useMemo(
    () => new Map(services.map((service) => [service._id, service])),
    [services],
  );
  const barberMap = useMemo(
    () => new Map(barbers.map((barber) => [barber._id, barber.name])),
    [barbers],
  );

  return useQueries({
    queries: dayTimestamps.map((dayMs) =>
      calendarDayQueryOptions(barbershopId, dayMs),
    ),
    combine: (results) => {
      const events: AppointmentCalendarEvent[] = [];

      for (const result of results) {
        for (const appointment of result.data ?? []) {
          if (
            barberFilter !== "all" &&
            appointment.barbershopMemberId !== barberFilter
          ) {
            continue;
          }

          const service = serviceMap.get(appointment.serviceId);
          events.push({
            id: appointment._id,
            title: appointment.customerName,
            start: new Date(appointment.date),
            end: new Date(
              eventEnd(
                appointment.date,
                appointmentItemsDuration(appointment) ?? service?.duration,
              ),
            ),
            color: STATUS_COLOR[appointment.status],
            readOnly: true,
            resourceId: appointment.barbershopMemberId,
            data: {
              appointment,
              barberName:
                barberMap.get(appointment.barbershopMemberId) ?? "Barbero",
              serviceName:
                appointmentItemsLabel(appointment) ??
                service?.name ??
                "Servicio",
            },
          });
        }
      }

      return {
        events: events.sort(
          (first, second) => first.start.getTime() - second.start.getTime(),
        ),
        isLoading: results.some((result) => result.isLoading),
      };
    },
  });
}
