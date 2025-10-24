import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type { Id } from "@panabarbero/convex/dataModel";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

export function appointmentsQueryOptions() {
  return convexQuery(api.appointments.getAppointments, {});
}

export function createAppointmentMutationOptions() {
  return useConvexMutation(api.appointments.createAppointment);
}

export function appointmentsByUserQueryOptions(userId: string) {
  return convexQuery(api.appointments.getAppointmentsByUserId, { userId });
}

export function appointmentsByBarbershopQueryOptions(
  barbershopId: Id<"barbershops">,
) {
  return convexQuery(api.appointments.getAppointmentsByBarbershopId, {
    barbershopId,
  });
}

export function useAppointments() {
  return useSuspenseQuery(appointmentsQueryOptions());
}

export function useAppointmentsByUser(userId: string) {
  return useSuspenseQuery(appointmentsByUserQueryOptions(userId));
}

export function useAppointmentsByBarbershop(barbershopId: Id<"barbershops">) {
  return useSuspenseQuery(appointmentsByBarbershopQueryOptions(barbershopId));
}

export function useAppointmentActions() {
  const createAppointment = useMutation({
    mutationFn: createAppointmentMutationOptions(),
  });
  const setStatus = useMutation({
    mutationFn: useConvexMutation(api.appointments.setAppointmentStatus),
  });
  const update = useMutation({
    mutationFn: useConvexMutation(api.appointments.updateAppointment),
  });
  const del = useMutation({
    mutationFn: useConvexMutation(api.appointments.deleteAppointment),
  });
  const cancel = useMutation({
    mutationFn: useConvexMutation(api.appointments.cancelAppointment),
  });
  const requestReschedule = useMutation({
    mutationFn: useConvexMutation(api.appointments.requestReschedule),
  });

  return {
    createAppointment,
    setStatus,
    update,
    del,
    cancel,
    requestReschedule,
  };
}
