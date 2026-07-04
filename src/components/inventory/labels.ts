import type {
  InventoryCategory,
  InventoryMovementType,
  InventoryUnit,
} from "@convex/schema";

import type { BadgeProps } from "@/components/ui/badge";

export const inventoryCategoryLabels: Record<InventoryCategory, string> = {
  drink: "Bebida",
  blade: "Cuchilla",
  machine: "Máquina",
  spray: "Spray",
  alcohol: "Alcohol",
  tool: "Herramienta",
  consumable: "Consumible",
  retail: "Venta",
  other: "Otro",
};

export const inventoryUnitLabels: Record<InventoryUnit, string> = {
  unit: "Unidades",
  ml: "Mililitros (ml)",
  g: "Gramos (g)",
  box: "Cajas",
  pack: "Paquetes",
};

/** Short suffixes for stock amounts ("12 und", "500 ml"). */
export const inventoryUnitSuffixes: Record<InventoryUnit, string> = {
  unit: "und",
  ml: "ml",
  g: "g",
  box: "cajas",
  pack: "paquetes",
};

const inventoryCountableUnits: Partial<
  Record<InventoryUnit, { one: string; other: string }>
> = {
  box: { one: "caja", other: "cajas" },
  pack: { one: "paquete", other: "paquetes" },
};

/** Count-aware unit suffix for stock displays. */
export function formatInventoryStockSuffix(
  count: number,
  unit: InventoryUnit,
): string {
  if (unit === "unit") {
    return "und";
  }

  if (unit === "ml" || unit === "g") {
    return unit;
  }

  const forms = inventoryCountableUnits[unit];

  return forms ? (count === 1 ? forms.one : forms.other) : unit;
}

export function formatRemainingBalanceLabel(balanceAfter: number): string {
  return balanceAfter === 1 ? "Quedó" : "Quedaron";
}

export const inventoryMovementTypeData: Record<
  InventoryMovementType,
  { label: string; variant: BadgeProps["variant"] }
> = {
  receipt: { label: "Recepción", variant: "success" },
  sale: { label: "Venta", variant: "info" },
  consumption: { label: "Consumo", variant: "secondary" },
  adjustment: { label: "Ajuste", variant: "outline" },
  waste: { label: "Merma", variant: "destructive" },
  reservation: { label: "Reserva", variant: "warning" },
  release: { label: "Liberación", variant: "secondary" },
  return: { label: "Devolución", variant: "success" },
  transfer_in: { label: "Traslado entrante", variant: "secondary" },
  transfer_out: { label: "Traslado saliente", variant: "secondary" },
};
