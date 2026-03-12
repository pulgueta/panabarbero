import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import type { Appointment, Barbershop } from "@convex/schema";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";

import { useBarbershopAvailability } from "./barbershop/use-barbershop";

export function appointmentByIdQueryOptions(appointmentId: Appointment["_id"]) {
  return convexQuery(api.appointments.getById, {
    id: appointmentId,
  });
}

export function createAppointmentMutationOptions() {
  return useConvexMutation(api.appointments.create);
}

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

export function userVisitedBarbershopsQueryOptions(userId: string | undefined) {
  return convexQuery(api.barbershops.getUserVisitedBarbershops, { userId });
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

export function useAppointmentById(id: Appointment["_id"]) {
  return useSuspenseQuery(appointmentByIdQueryOptions(id));
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

export function useVisitedBarbershops(userId: string | undefined) {
  return useSuspenseQuery(userVisitedBarbershopsQueryOptions(userId));
}

export function appointmentFormMetadataQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.barbershops.getAvailability, {
    id: barbershopId,
  });
}

type WeekdayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export function useAppointmentFormMetadata(barbershopId: Barbershop["_id"]) {
  const { data: availability } = useBarbershopAvailability(barbershopId);

  const dayIndexes: Record<WeekdayKey, number> = Object.freeze({
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  });

  const activeDays = new Set(
    availability
      ?.filter((d) => d.weekDay?.isActive)
      .map((d) => dayIndexes[d.weekDay.day as WeekdayKey]) ?? [],
  );

  const disableDay = (day: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentDay = new Date(day);
    currentDay.setHours(0, 0, 0, 0);

    const weekday = currentDay.getDay();

    if (currentDay < today) return true;

    if (!activeDays.has(weekday)) return true;

    return false;
  };

  const scheduleForDate = (timestamp?: number) => {
    if (!timestamp || !availability) return undefined;

    const weekday: WeekdayKey = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][new Date(timestamp).getDay()] as WeekdayKey;

    return availability.find((entry) => entry.weekDay.day === weekday);
  };

  const timeStringToMinutes = (value?: string | null) => {
    if (!value) return null;
    const [hours, minutes] = value.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    return hours * 60 + minutes;
  };

  const minutesOfTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.getHours() * 60 + date.getMinutes();
  };

  return {
    disableDay,
    scheduleForDate,
    timeStringToMinutes,
    minutesOfTimestamp,
  };
}

export function useAppointmentActions() {
  const createAppointment = useMutation({
    mutationFn: createAppointmentMutationOptions(),
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
