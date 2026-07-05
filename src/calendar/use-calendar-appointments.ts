import { api } from "@convex/_generated/api";
import type {
  Barbershop,
  BarbershopMember,
  BarbershopMemberWithName,
  Service,
} from "@convex/schema";
import { convexQuery } from "@convex-dev/react-query";
import { useQueries } from "@tanstack/react-query";
import { eachDayOfInterval, startOfDay } from "date-fns";
import { useMemo } from "react";

import { eventEnd, getFetchRange } from "./helpers";
import type { CalendarEvent, CalendarView } from "./types";

/**
 * Query options for a single day's appointments. The calendar is the only
 * caller that fans this out across a range, so the options live here rather
 * than in `src/hooks`. Reused by the route loader to prime the cache.
 */
export function calendarDayQueryOptions(
  barbershopId: Barbershop["_id"],
  dayMs: number,
) {
  return convexQuery(api.appointments.getByBarbershopId, {
    id: barbershopId,
    date: dayMs,
  });
}

/** Midnight timestamps for every day in a view's visible range. */
export function getRangeDayTimestamps(
  view: CalendarView,
  date: Date,
): number[] {
  const { start, end } = getFetchRange(view, date);
  return eachDayOfInterval({ start, end }).map((day) =>
    startOfDay(day).getTime(),
  );
}

interface UseCalendarAppointmentsOptions {
  barbershopId: Barbershop["_id"];
  view: CalendarView;
  date: Date;
  /** A barber member id to isolate, or "all" for every barber. */
  barberFilter: BarbershopMember["_id"] | "all";
  services: Service[];
  barbers: BarbershopMemberWithName[];
}

/**
 * The single data seam for the calendar. Fetches the visible range as one
 * reactive query per day against the existing day-windowed
 * `getByBarbershopId` (which already applies the "barbers see only their own"
 * server-side filter), then builds and partitions events once.
 *
 * NOTE: month/agenda fan out to ~35–42 day subscriptions to stay within the
 * "single new mutation" backend budget. If an optional `endDate` range arg is
 * ever added to `getByBarbershopId`, collapse the body below to one query.
 */
export function useCalendarAppointments({
  barbershopId,
  view,
  date,
  barberFilter,
  services,
  barbers,
}: UseCalendarAppointmentsOptions): {
  events: CalendarEvent[];
  isLoading: boolean;
} {
  const dayTimestamps = useMemo(
    () => getRangeDayTimestamps(view, date),
    [view, date],
  );

  const results = useQueries({
    queries: dayTimestamps.map((ms) =>
      calendarDayQueryOptions(barbershopId, ms),
    ),
  });

  const serviceMap = useMemo(
    () => new Map(services.map((service) => [service._id, service])),
    [services],
  );
  const barberMap = useMemo(
    () => new Map(barbers.map((barber) => [barber._id, barber.name])),
    [barbers],
  );

  const isLoading = results.some((result) => result.isLoading);

  const events = useMemo(() => {
    const built: CalendarEvent[] = [];
    for (const result of results) {
      for (const appointment of result.data ?? []) {
        if (
          barberFilter !== "all" &&
          appointment.barbershopMemberId !== barberFilter
        ) {
          continue;
        }
        const service = serviceMap.get(appointment.serviceId);
        built.push({
          id: appointment._id,
          title: appointment.customerName,
          start: appointment.date,
          end: eventEnd(appointment.date, service?.duration),
          status: appointment.status,
          barberId: appointment.barbershopMemberId,
          barberName:
            barberMap.get(appointment.barbershopMemberId) ?? "Barbero",
          serviceName: service?.name ?? "Servicio",
          appointment,
        });
      }
    }
    return built.sort((a, b) => a.start - b.start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberFilter, serviceMap, barberMap, results]);

  return { events, isLoading };
}
