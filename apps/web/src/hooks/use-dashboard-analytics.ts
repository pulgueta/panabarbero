import { api } from "@convex/_generated/api";
import type { Barbershop } from "@convex/schema";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";

export type AppointmentsTrendPoint = FunctionReturnType<
  typeof api.dashboardAnalytics.getAppointmentsTrend
>[number];

export type OperationsBreakdown = FunctionReturnType<
  typeof api.dashboardAnalytics.getOperationsBreakdown
>;

export function appointmentsTrendQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.dashboardAnalytics.getAppointmentsTrend, {
    barbershop: { id: barbershopId },
  });
}

export function operationsBreakdownQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.dashboardAnalytics.getOperationsBreakdown, {
    barbershop: { id: barbershopId },
  });
}

export function useAppointmentsTrend(barbershopId: Barbershop["_id"]) {
  return useQuery(appointmentsTrendQueryOptions(barbershopId));
}

export function useOperationsBreakdown(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(operationsBreakdownQueryOptions(barbershopId));
}
