import type { Doc } from "@panabarbero/backend/convex/_generated/dataModel";
import type { ChipColor } from "heroui-native";

export type Appointment = Doc<"appointments">;
type AppointmentStatus = Appointment["status"];
type AppointmentItem = NonNullable<Appointment["items"]>[number];

const statusLabel: Record<AppointmentStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  "no-show": "No asistió",
  rescheduled: "Reagendada",
  denied: "Denegada",
};

const statusColor: Record<AppointmentStatus, ChipColor> = {
  pending: "warning",
  confirmed: "default",
  cancelled: "danger",
  completed: "success",
  "no-show": "danger",
  rescheduled: "default",
  denied: "danger",
};

export function appointmentStatus(status: AppointmentStatus) {
  return { label: statusLabel[status], color: statusColor[status] };
}

function hasItems(
  appointment: Appointment,
): appointment is Appointment & { items: AppointmentItem[] } {
  return !!appointment.items && appointment.items.length > 0;
}

/** Σ(finalPrice ?? price) over the snapshot lines; null for legacy rows. */
export function lineTotal(appointment: Appointment): number | null {
  if (!hasItems(appointment)) return null;
  return appointment.items.reduce(
    (total, item) => total + (item.finalPrice ?? item.price),
    0,
  );
}

/** A "starting" line without an agreed final price. */
export function isStartingItem(item: AppointmentItem): boolean {
  return item.priceType === "starting" && item.finalPrice === undefined;
}

/** The total still has a pending "desde" line, so it reads "Desde $X". */
export function isStartingPrice(appointment: Appointment): boolean {
  return hasItems(appointment) && appointment.items.some(isStartingItem);
}

/** "Corte + Barba"; "Servicio" for legacy rows without snapshot lines. */
export function servicesLabel(appointment: Appointment): string {
  if (!hasItems(appointment)) return "Servicio";
  return appointment.items.map((item) => item.name).join(" + ");
}

/** Summed duration in minutes; null for legacy rows. */
export function totalDuration(appointment: Appointment): number | null {
  if (!hasItems(appointment)) return null;
  return appointment.items.reduce((total, item) => total + item.duration, 0);
}

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** "$ 45.000" */
export function formatCop(amount: number): string {
  return copFormatter.format(amount);
}

/** "$ 45.000" or "Desde $ 45.000"; null for legacy rows. */
export function priceLabel(appointment: Appointment): string | null {
  const total = lineTotal(appointment);
  if (total === null) return null;
  return isStartingPrice(appointment)
    ? `Desde ${formatCop(total)}`
    : formatCop(total);
}
