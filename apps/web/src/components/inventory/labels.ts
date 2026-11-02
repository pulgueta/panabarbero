import type {
  InventoryCategory,
  InventoryMovementType,
  InventoryPresentationUnit,
  InventoryStockBehavior,
  InventoryUnit,
} from "@convex/schema";
import { isEquipmentCategory } from "@convex/schema";

import type { BadgeProps } from "@/components/ui/badge";

export const inventoryCategoryLabels: Record<InventoryCategory, string> = {
  retail: "Cosmética y retail",
  drink: "Bebidas",
  consumable: "Insumo profesional",
  spray: "Sprays",
  alcohol: "Alcohol y antisépticos",
  blade: "Cuchillas y desechables",
  ppe: "Bioseguridad",
  cleaning: "Aseo y desinfección",
  linen: "Toallas y textiles",
  machine: "Máquinas",
  tool: "Herramientas",
  other: "Otro",
};

/**
 * Presentation-only grouping for the category select — the enum stays flat.
 * Order matters: it drives the option order in forms.
 */
export const inventoryCategoryGroups: {
  label: string;
  categories: InventoryCategory[];
}[] = [
  { label: "Venta", categories: ["retail", "drink"] },
  {
    label: "Insumos",
    categories: ["consumable", "spray", "alcohol", "blade", "ppe", "cleaning"],
  },
  { label: "Equipo y textiles", categories: ["machine", "tool", "linen"] },
  { label: "Otro", categories: ["other"] },
];

export { isEquipmentCategory };

export const inventoryStockBehaviorLabels: Record<
  InventoryStockBehavior,
  string
> = {
  consumable: "Consumible o vendible",
  durable: "Durable o reutilizable",
};

export const inventoryUnitLabels: Record<InventoryUnit, string> = {
  unit: "Unidades (envases o piezas)",
  box: "Cajas",
  pack: "Paquetes",
  ml: "A granel — mililitros (ml)",
  g: "A granel — gramos (g)",
};

/** Counting units whose contents can be described by a presentation. */
export function isCountingUnit(unit: InventoryUnit): boolean {
  return unit === "unit" || unit === "box" || unit === "pack";
}

export const inventoryPresentationUnitLabels: Record<
  InventoryPresentationUnit,
  string
> = {
  ml: "Mililitros (ml)",
  g: "Gramos (g)",
  und: "Unidades",
};

/** "500 ml" / "x 100 und" — what one counted unit contains. */
export function formatPresentation(
  value: number,
  unit: InventoryPresentationUnit,
): string {
  return unit === "und" ? `x ${value} und` : `${value} ${unit}`;
}

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

/** Spanish names for raw item fields leaking into audit diffs ("~ unitCost: …"). */
export const inventoryFieldLabels: Record<string, string> = {
  name: "Nombre",
  sku: "SKU",
  category: "Categoría",
  unit: "Unidad",
  stockBehavior: "Comportamiento",
  brand: "Marca",
  supplier: "Proveedor",
  customLabel: "Etiqueta",
  presentationValue: "Contenido",
  presentationUnit: "Unidad de contenido",
  model: "Modelo",
  serialNumber: "N.º de serie",
  purchasedAt: "Fecha de compra",
  warrantyUntil: "Garantía hasta",
  notes: "Notas",
  isSellable: "Disponible para la venta",
  unitCost: "Costo unitario",
  salePrice: "Precio de venta",
  reorderPoint: "Punto de pedido",
  reorderQuantity: "Cantidad a reponer",
  allowNegativeStock: "Permitir stock negativo",
  imageKey: "Foto",
  deletedAt: "Archivado",
};

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
