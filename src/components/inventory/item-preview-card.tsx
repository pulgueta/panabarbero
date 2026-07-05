import { PackageIcon } from "@phosphor-icons/react";
import type { FC } from "react";
import { useEffect, useMemo } from "react";

import {
  inventoryCategoryLabels,
  inventoryUnitSuffixes,
} from "@/components/inventory/labels";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { ItemFormEngine } from "./item-form";

function previewStatus(
  initialQuantity: number | undefined,
  reorderPoint: number,
): { label: string; variant: BadgeProps["variant"] } {
  const onHand = initialQuantity ?? 0;

  if (onHand <= 0) {
    return { label: "Sin stock inicial", variant: "secondary" };
  }
  if (onHand <= reorderPoint) {
    return { label: "Bajo stock", variant: "warning" };
  }
  return { label: "En stock", variant: "success" };
}

/**
 * Live preview for the dedicated product-creation page: mirrors how the row
 * will read in the inventory table as the form is filled. Subscribes to the
 * lifted form engine — no duplicated state.
 */
interface ItemPreviewCardProps {
  engine: ItemFormEngine;
  showInitialQuantity?: boolean;
}

export const ItemPreviewCard: FC<ItemPreviewCardProps> = ({
  engine,
  showInitialQuantity = true,
}) => {
  const { form, photoFile } = engine;

  const photoUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile],
  );

  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  return (
    <form.Subscribe selector={(state) => state.values}>
      {(values) => {
        const status = showInitialQuantity
          ? previewStatus(
              values.initialQuantity,
              Number(values.reorderPoint) || 0,
            )
          : { label: "Inventario", variant: "outline" as const };
        const unitSuffix = inventoryUnitSuffixes[values.unit];

        return (
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="flex items-center gap-3 border-b p-4">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Foto del producto"
                  className="size-12 shrink-0 rounded-md border object-cover"
                />
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md border bg-muted">
                  <PackageIcon className="size-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {values.name || "Nombre del producto"}
                </p>
                <p className="truncate text-muted-foreground text-xs">
                  {values.sku || inventoryCategoryLabels[values.category]}
                </p>
              </div>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>

            <dl className="space-y-2 p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Categoría</dt>
                <dd>{inventoryCategoryLabels[values.category]}</dd>
              </div>
              {showInitialQuantity ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Stock inicial</dt>
                  <dd className="tabular-nums">
                    {values.initialQuantity !== undefined &&
                    values.initialQuantity > 0
                      ? `${values.initialQuantity} ${unitSuffix}`
                      : "—"}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Costo unitario</dt>
                <dd className="tabular-nums">
                  {formatCurrency(Number(values.unitCost) || 0)}
                </dd>
              </div>
              {values.isSellable ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Precio de venta</dt>
                  <dd className="tabular-nums">
                    {values.salePrice !== undefined
                      ? formatCurrency(Number(values.salePrice) || 0)
                      : "—"}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Alerta de bajo stock</dt>
                <dd className="tabular-nums">
                  {Number(values.reorderPoint) > 0
                    ? `≤ ${Number(values.reorderPoint)} ${unitSuffix}`
                    : "Sin alerta"}
                </dd>
              </div>
            </dl>
          </div>
        );
      }}
    </form.Subscribe>
  );
};
