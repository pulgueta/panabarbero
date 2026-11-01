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

// Same mapping as the web calendar (apps/web/src/calendar/constants.ts).
const statusColor: Record<AppointmentStatus, ChipColor | "info"> = {
  pending: "warning",
  confirmed: "success",
  cancelled: "danger",
  completed: "success",
  "no-show": "danger",
  rescheduled: "info",
  denied: "danger",
};

/** Chips have no info color: paint the info tokens over "default", without its glass layer. */
const infoChip = {
  color: "default",
  className: "bg-info-soft",
  background: null,
} as const;

/** `chip` spreads onto a soft `Chip`; `labelClassName` goes on its `Chip.Label`. */
export function appointmentStatus(status: AppointmentStatus) {
  const color = statusColor[status];
  const isInfo = color === "info";
  return {
    label: statusLabel[status],
    chip: isInfo ? infoChip : { color },
    labelClassName: isInfo ? "text-info-soft-foreground" : undefined,
  };
}

/**
 * Timeline block paint: a solid left bar and a soft tint of the status color.
 * Finished and dropped appointments go gray; dropped ones also fade.
 */
export function timelineStatus(status: AppointmentStatus) {
  switch (status) {
    case "confirmed":
      return { bar: "bg-success", tint: "bg-success-soft", faded: false };
    case "pending":
      return { bar: "bg-warning", tint: "bg-warning-soft", faded: false };
    case "rescheduled":
      return { bar: "bg-info", tint: "bg-info-soft", faded: false };
    case "completed":
      return { bar: "bg-muted", tint: "bg-surface-tertiary", faded: false };
    default:
      return { bar: "bg-muted", tint: "bg-surface-tertiary", faded: true };
  }
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

/** Summed duration in minutes; null for legacy rows. Range rows carry durations only. */
export function totalDuration(appointment: {
  items?: { duration: number }[];
}): number | null {
  if (!appointment.items?.length) return null;
  return appointment.items.reduce((total, item) => total + item.duration, 0);
}

/** "Daniela" from "Daniela Marín", for narrow week blocks and month chips. */
export function firstName(customerName: string): string {
  return customerName.trim().split(/\s+/)[0] || customerName;
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
