import { errorMessages } from "@convex/errors";
import type { InventoryMovementType } from "@convex/schema";
import { inventoryMovementTypes } from "@convex/schema";
import { ConvexError } from "convex/values";

import { inventoryMovementTypeData } from "@/components/inventory/labels";

/**
 * Shared, JSX-free helpers for the movements ledger: the client-side filter
 * shape, date-window presets, and the direction/sign a movement applies to
 * stock (faithful to `movementEffects` in `convex/inventory.ts`).
 */

/** UI filter state. `datePreset` collapses to `startTime` for the server. */
export type MovementFilterState = {
  type?: InventoryMovementType;
  itemId?: string;
  actorUserId?: string;
  datePreset: MovementDatePreset;
};

export type MovementDatePreset = "all" | "today" | "7d" | "30d";

export const MOVEMENT_DATE_PRESETS: {
  value: MovementDatePreset;
  label: string;
}[] = [
  { value: "all", label: "Todo el historial" },
  { value: "today", label: "Hoy" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
];

/** America/Bogota is a fixed UTC-5 offset (no DST), so day math is exact. */
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfBogotaDay(nowMs: number): number {
  const shifted = nowMs - BOGOTA_OFFSET_MS;
  return Math.floor(shifted / DAY_MS) * DAY_MS + BOGOTA_OFFSET_MS;
}

/** Lower bound (epoch ms) for a preset, or undefined for the full history. */
export function datePresetToStart(
  preset: MovementDatePreset,
  nowMs: number,
): number | undefined {
  switch (preset) {
    case "today":
      return startOfBogotaDay(nowMs);
    case "7d":
      return nowMs - 7 * DAY_MS;
    case "30d":
      return nowMs - 30 * DAY_MS;
    default:
      return undefined;
  }
}

/** Chip order for the type filter. Mirrors the schema enum. */
export const movementTypeOrder: readonly InventoryMovementType[] =
  inventoryMovementTypes;

export type MovementTone = "in" | "out" | "reserved";

/**
 * The sign and tone a movement applies to on-hand stock — a faithful read of
 * `movementEffects`: receipts add, sales/consumption/waste subtract,
 * adjustments carry their own sign, reservations/releases touch only reserved.
 */
export function movementDirection(
  type: InventoryMovementType,
  quantity: number,
): { sign: "+" | "-" | ""; tone: MovementTone } {
  switch (type) {
    case "receipt":
    case "return":
    case "transfer_in":
      return { sign: "+", tone: "in" };
    case "sale":
    case "consumption":
    case "waste":
    case "transfer_out":
      return { sign: "-", tone: "out" };
    case "adjustment":
      return quantity < 0
        ? { sign: "-", tone: "out" }
        : { sign: "+", tone: "in" };
    case "reservation":
    case "release":
      return { sign: "", tone: "reserved" };
    default:
      throw new ConvexError(
        errorMessages.notFound(`tipo de movimiento ${type satisfies never}`),
      );
  }
}

export const movementToneClass: Record<MovementTone, string> = {
  in: "text-success-foreground",
  out: "text-destructive",
  reserved: "text-muted-foreground",
};

export const movementDateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export function movementTypeLabel(type: InventoryMovementType): string {
  return inventoryMovementTypeData[type].label;
}
