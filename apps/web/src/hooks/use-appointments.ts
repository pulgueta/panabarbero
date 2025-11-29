import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type { Appointment, Barbershop } from "@panabarbero/convex/schemas";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";

export function appointmentsQueryOptions() {
  return convexQuery(api.appointments.getAppointments, {});
}

export function appointmentByIdQueryOptions(appointmentId: Appointment["_id"]) {
  return convexQuery(api.appointments.getAppointmentById, { appointmentId });
}

export function createAppointmentMutationOptions() {
  return useConvexMutation(api.appointments.createAppointment);
}

export function appointmentsByUserQueryOptions(userId: string) {
  return convexQuery(api.appointments.getAppointmentsByUserId, { userId });
}

export function appointmentsByBarbershopQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.appointments.getAppointmentsByBarbershopId, {
    barbershopId,
  });
}

export function useAppointments() {
  return useSuspenseQuery(appointmentsQueryOptions());
}

export function useAppointmentById(id: Appointment["_id"]) {
  return useSuspenseQuery(appointmentByIdQueryOptions(id));
}

export function useAppointmentsByUser(userId: string) {
  return useSuspenseQuery(appointmentsByUserQueryOptions(userId));
}

export function useAppointmentsByBarbershop(barbershopId: Barbershop["_id"]) {
  return useQuery(appointmentsByBarbershopQueryOptions(barbershopId));
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
  const deleteAppointmentMutation = useMutation({
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
    deleteAppointmentMutation,
    cancel,
    requestReschedule,
  };
}
