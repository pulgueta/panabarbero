/**
 * Single source of truth for appointment line-item math.
 *
 * `items` is canonical on new bookings; legacy rows (pre-backfill) synthesize
 * a single line here so every consumer reads one shape. Overlap/availability
 * widths for EXISTING rows go through `conflictDurationMinutes`, which keeps
 * the historical `liveService?.duration ?? 0` chain bit-for-bit identical for
 * legacy rows.
 */

import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Appointment, AppointmentItem, Service } from "./schema";

const FALLBACK_NAME = "Servicio";
const FALLBACK_DURATION = 30;

/** Booking-time snapshot of the selected services, in selection order. */
export function buildItems(services: Service[]): AppointmentItem[] {
  return services.map((service) => ({
    serviceId: service._id,
    name: service.name,
    price: service.price,
    priceType: service.priceType ?? "fixed",
    duration: service.duration,
  }));
}

/**
 * `items` ?? a synthesized single legacy line. Completed rows prefer the
 * completion-time snapshot (`completedServicePrice/Name`) so analytics keep
 * matching; otherwise the live service; otherwise "Servicio" / 0 / 30.
 */
export function normalizeItems(
  appointment: Appointment,
  liveService: Service | null | undefined,
): AppointmentItem[] {
  if (appointment.items && appointment.items.length > 0) {
    return appointment.items;
  }

  const isCompleted = appointment.status === "completed";
  const name =
    (isCompleted ? appointment.completedServiceName : undefined) ??
    liveService?.name ??
    FALLBACK_NAME;
  const price =
    (isCompleted ? appointment.completedServicePrice : undefined) ??
    liveService?.price ??
    0;

  return [
    {
      serviceId: appointment.serviceId,
      name,
      price,
      priceType: "fixed",
      duration: liveService?.duration ?? FALLBACK_DURATION,
    },
  ];
}

/** Normalized items, loading the legacy row's live service when needed. */
export async function getAppointmentItems(
  ctx: QueryCtx | MutationCtx,
  appointment: Appointment,
): Promise<AppointmentItem[]> {
  if (appointment.items && appointment.items.length > 0) {
    return appointment.items;
  }

  const liveService = await ctx.db.get(appointment.serviceId);

  return normalizeItems(appointment, liveService);
}

export function itemsTotalDuration(items: AppointmentItem[]): number {
  return items.reduce((total, item) => total + item.duration, 0);
}

/** Σ(finalPrice ?? price) — the appointment's effective total. */
export function itemsTotal(items: AppointmentItem[]): number {
  return items.reduce(
    (total, item) => total + (item.finalPrice ?? item.price),
    0,
  );
}

/** Joined display name: "Corte + Barba". */
export function itemsLabel(items: AppointmentItem[]): string {
  return items.map((item) => item.name).join(" + ");
}

/** Starting-priced lines that still need a final price to complete. */
export function startingLinesMissingFinal(
  items: AppointmentItem[],
): AppointmentItem[] {
  return items.filter(
    (item) => item.priceType === "starting" && item.finalPrice === undefined,
  );
}

/**
 * Overlap/availability width for an EXISTING appointment. Kept separate from
 * `itemsTotalDuration` on purpose: legacy rows (no items) must reproduce
 * today's exact `liveService?.duration ?? 0` chain so pre-backfill conflict
 * math never shifts.
 */
export function conflictDurationMinutes(
  appointment: Appointment,
  lookup: (serviceId: Service["_id"]) => Service | null | undefined,
): number {
  if (appointment.items && appointment.items.length > 0) {
    return itemsTotalDuration(appointment.items);
  }

  return lookup(appointment.serviceId)?.duration ?? 0;
}
