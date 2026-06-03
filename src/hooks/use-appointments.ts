import { api } from "@convex/_generated/api";
import type { Barbershop, BarbershopMember, Service } from "@convex/schema";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { WeekdayKey } from "@/lib/schedule-utils";
import {
  getDayKeyForDate,
  minutesOfDay,
  parseTimeToMinutes,
} from "@/lib/schedule-utils";
import { useBarbershopAvailability } from "./barbershop/use-barbershop";

export function appointmentsByUserQueryOptions(
  userId: string,
  cursor: string | null = null,
) {
  return convexQuery(api.appointments.getByUserId, {
    userId,
    paginationOpts: {
      cursor,
      numItems: 9,
    },
  });
}

export function requestRescheduleQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.appointments.getRescheduledRequests, {
    id: barbershopId,
  });
}

export function appointmentsByBarbershopQueryOptions(opts: {
  id: Barbershop["_id"];
  date: number | undefined;
}) {
  return convexQuery(api.appointments.getByBarbershopId, opts);
}

export function useRescheduledAppointmentRequests(
  barbershopId: Barbershop["_id"],
) {
  return useSuspenseQuery(requestRescheduleQueryOptions(barbershopId));
}

export function useAppointmentsByUser(
  userId: string,
  cursor: string | null = null,
) {
  return useSuspenseQuery(appointmentsByUserQueryOptions(userId, cursor));
}

export function useAppointmentsByBarbershop(opts: {
  id: Barbershop["_id"];
  date: number | undefined;
}) {
  return useSuspenseQuery(appointmentsByBarbershopQueryOptions(opts));
}

function availableSlotsQueryOptions(opts: {
  barbershopId: Barbershop["_id"];
  barbershopMemberId: BarbershopMember["_id"];
  serviceId: Service["_id"];
  date: number;
}) {
  return convexQuery(api.appointments.getAvailableSlots, opts);
}

export function useAvailableSlots(opts: {
  barbershopId: Barbershop["_id"];
  barbershopMemberId: BarbershopMember["_id"];
  serviceId: Service["_id"];
  date: number;
}) {
  return useSuspenseQuery(availableSlotsQueryOptions(opts));
}

export function useAppointmentFormMetadata(barbershopId: Barbershop["_id"]) {
  const { data: availability } = useBarbershopAvailability(barbershopId);

  const activeDays = new Set(
    availability?.flatMap((d) => {
      if (!d.weekDay?.isActive) return [];
      const key = d.weekDay.day as WeekdayKey;
      const dayIndexes: Record<WeekdayKey, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      return [dayIndexes[key]];
    }) ?? [],
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const disableDay = (day: Date): boolean => {
    const currentDay = new Date(day);
    currentDay.setHours(0, 0, 0, 0);

    if (currentDay < today) return true;

    if (!activeDays.has(currentDay.getDay())) return true;

    return false;
  };

  const scheduleForDate = (timestamp?: number) => {
    if (!timestamp || !availability) return undefined;

    const weekday = getDayKeyForDate(timestamp);

    return availability.find((entry) => entry.weekDay.day === weekday);
  };

  return {
    disableDay,
    scheduleForDate,
    timeStringToMinutes: parseTimeToMinutes,
    minutesOfTimestamp: minutesOfDay,
  };
}

export function useAppointmentActions() {
  const createAppointment = useMutation({
    mutationFn: useConvexMutation(api.appointments.create),
  });
  const setStatusMutation = useMutation({
    mutationFn: useConvexMutation(
      api.appointments.setStatus,
    ).withOptimisticUpdate((localStore, args) => {
      const existingAppointment = localStore.getQuery(
        api.appointments.getById,
        {
          id: args.appointment.id,
        },
      );

      if (existingAppointment) {
        localStore.setQuery(
          api.appointments.getById,
          { id: args.appointment.id },
          { ...existingAppointment, status: args.status },
        );
      }
    }),
  });
  const deleteAppointmentMutation = useMutation({
    mutationFn: useConvexMutation(api.appointments.deleteAppointment),
  });
  const cancelAppointmentMutation = useMutation({
    mutationFn: useConvexMutation(api.appointments.cancel),
  });
  const requestRescheduleMutation = useMutation({
    mutationFn: useConvexMutation(api.appointments.requestReschedule),
  });
  const answerRescheduleRequest = useMutation({
    mutationFn: useConvexMutation(api.appointments.answerRescheduleRequest),
  });

  return {
    createAppointment,
    setStatusMutation,
    deleteAppointmentMutation,
    cancelAppointmentMutation,
    requestRescheduleMutation,
    answerRescheduleRequest,
  };
}
