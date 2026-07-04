import type {
  Barbershop,
  InventoryCategory,
  InventoryItem,
  InventoryUnit,
} from "@convex/schema";
import {
  inventoryCategories,
  inventoryItems,
  inventoryUnits,
} from "@convex/schema";
import { PackageIcon } from "@phosphor-icons/react";
import { revalidateLogic } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import type { FC } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import {
  inventoryCategoryLabels,
  inventoryUnitLabels,
} from "@/components/inventory/labels";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInventoryActions } from "@/hooks/use-inventory";
import { getLogoUrl, useUpload } from "@/hooks/use-upload";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { parseNonNegativeInteger } from "@/lib/inventory-form";

const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,image/avif";

export interface ItemFormData {
  barbershopId: Barbershop["_id"];
  name: string;
  sku?: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  isSellable: boolean;
  unitCost: number;
  salePrice?: number;
  reorderPoint: number;
  reorderQuantity?: number;
  allowNegativeStock: boolean;
}

interface ItemFormProps {
  initialValues?: ItemFormData;
  barbershopId: Barbershop["_id"];
  itemId?: InventoryItem["_id"];
  currentImageKey?: string;
  onSuccess?: () => void;
}

export const ItemForm: FC<ItemFormProps> = ({
  initialValues,
  barbershopId,
  itemId,
  currentImageKey,
  onSuccess,
}) => {
  const haptic = useWebHaptics();

  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const {
    uploadFile: { isUploading, uploadFile },
    deleteFileMutation: { mutateAsync: deleteFile },
  } = useUpload({ type: "inventory-item" });

  const {
    createItemMutation: { mutateAsync: createItem },
    updateItemMutation: { mutateAsync: updateItem },
  } = useInventoryActions();

  const defaultValues: ItemFormData = initialValues ?? {
    barbershopId,
    name: "",
    sku: undefined,
    category: "consumable",
    unit: "unit",
    isSellable: false,
    unitCost: 0,
    salePrice: undefined,
    reorderPoint: 0,
    reorderQuantity: undefined,
    allowNegativeStock: false,
  };

  const form = useAppForm({
    onSubmitInvalid: () => {
      haptic.trigger("error");
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      // @ts-expect-error - convex id schema is not supported by tanstack form
      onSubmit: initialValues
        ? inventoryItems.updateSchema
        : inventoryItems.insertSchema,
    },
    defaultValues,
    onSubmit: async ({ value }) => {
      try {
        let imageKey = currentImageKey;

        if (photoFile) {
          imageKey = await uploadFile(photoFile);
        }

        const data = {
          barbershopId,
          name: value.name,
          sku: value.sku || undefined,
          category: value.category,
          unit: value.unit,
          isSellable: value.isSellable,
          unitCost:
            parseNonNegativeInteger(value.unitCost) ??
            (itemId ? (initialValues?.unitCost ?? 0) : 0),
          salePrice:
            value.isSellable && value.salePrice !== undefined
              ? (parseNonNegativeInteger(value.salePrice) ?? undefined)
              : undefined,
          reorderPoint:
            parseNonNegativeInteger(value.reorderPoint) ??
            (itemId ? (initialValues?.reorderPoint ?? 0) : 0),
          reorderQuantity:
            value.reorderQuantity !== undefined
              ? (parseNonNegativeInteger(value.reorderQuantity) ?? undefined)
              : undefined,
          allowNegativeStock: value.allowNegativeStock,
          imageKey,
        };

        if (itemId) {
          await updateItem({ id: itemId, data });

          // Replacing the photo orphans the old object — best-effort cleanup.
          if (currentImageKey && imageKey !== currentImageKey) {
            try {
              await deleteFile({ key: currentImageKey });
            } catch {
              // Non-fatal: old object may already be gone
            }
          }

          haptic.trigger("success");
          toast.success("Producto actualizado exitosamente");

          onSuccess?.();
        } else {
          await createItem(data);

          haptic.trigger("success");
          toast.success("Producto creado exitosamente");

          onSuccess?.();
        }
      } catch (error) {
        haptic.trigger("error");
        toast.error(getConvexErrorMessage(error));
        return;
      }
    },
  });

  useHotkey("Control+Enter", () => form.handleSubmit(), {
    preventDefault: true,
    stopPropagation: true,
  });

  const imageUrl = getLogoUrl(currentImageKey);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="w-full space-y-4"
    >
      <FieldGroup>
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label="Nombre del producto"
              placeholder="Cuchillas dobles"
            />
          )}
        </form.AppField>

        <div className="grid grid-cols-2 gap-4">
          <form.AppField name="category">
            {(field) => (
              <field.SelectField
                label="Categoría"
                className="w-full"
                options={inventoryCategories.map((category) => ({
                  value: category,
                  label: inventoryCategoryLabels[category],
                }))}
              />
            )}
          </form.AppField>

          <form.AppField name="unit">
            {(field) => (
              <field.SelectField
                label="Unidad"
                className="w-full"
                options={inventoryUnits.map((unit) => ({
                  value: unit,
                  label: inventoryUnitLabels[unit],
                }))}
              />
            )}
          </form.AppField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <form.AppField name="unitCost">
            {(field) => (
              <field.TextField
                label="Costo unitario"
                description="En pesos"
                placeholder="5000"
                type="number"
                min={0}
                className="w-full tabular-nums"
                value={field.state.value ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;

                  if (raw === "") {
                    field.handleChange(
                      itemId ? (undefined as unknown as number) : 0,
                    );
                    return;
                  }

                  field.handleChange(Number(raw));
                }}
              />
            )}
          </form.AppField>

          <form.AppField name="sku">
            {(field) => (
              <field.TextField
                label="SKU"
                description="Opcional"
                placeholder="CUCH-001"
                className="w-full"
                value={field.state.value ?? ""}
                onChange={(e) =>
                  field.handleChange(e.target.value || undefined)
                }
              />
            )}
          </form.AppField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <form.AppField name="reorderPoint">
            {(field) => (
              <field.TextField
                label="Punto de pedido"
                description="Alerta de bajo stock"
                placeholder="5"
                type="number"
                min={0}
                className="w-full tabular-nums"
                value={field.state.value ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;

                  if (raw === "") {
                    field.handleChange(
                      itemId ? (undefined as unknown as number) : 0,
                    );
                    return;
                  }

                  field.handleChange(Number(raw));
                }}
              />
            )}
          </form.AppField>

          <form.AppField name="reorderQuantity">
            {(field) => (
              <field.TextField
                label="Cantidad a reponer"
                description="Opcional"
                placeholder="10"
                type="number"
                className="w-full tabular-nums"
                value={field.state.value ?? ""}
                onChange={(e) =>
                  field.handleChange(
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            )}
          </form.AppField>
        </div>

        <form.AppField name="isSellable">
          {(field) => <field.SwitchField label="Disponible para la venta" />}
        </form.AppField>

        <form.Subscribe selector={(state) => state.values.isSellable}>
          {(isSellable) =>
            isSellable ? (
              <form.AppField name="salePrice">
                {(field) => (
                  <field.TextField
                    label="Precio de venta"
                    placeholder="30000"
                    type="number"
                    className="w-full tabular-nums"
                    value={field.state.value ?? ""}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                      )
                    }
                  />
                )}
              </form.AppField>
            ) : null
          }
        </form.Subscribe>

        <form.AppField name="allowNegativeStock">
          {(field) => <field.SwitchField label="Permitir stock negativo" />}
        </form.AppField>

        <div className="space-y-2">
          <Label htmlFor="item-photo">Foto del producto (opcional)</Label>
          <div className="flex items-center gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Foto actual del producto"
                  className="size-full object-cover"
                />
              ) : (
                <PackageIcon className="size-6 text-muted-foreground/50" />
              )}
            </div>
            <Input
              id="item-photo"
              type="file"
              accept={ACCEPTED_TYPES}
              disabled={isUploading}
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      </FieldGroup>

      <form.AppForm>
        <form.SubmitButton
          label="Guardar"
          className="w-full"
          forceEnabled={photoFile !== null}
        />
      </form.AppForm>
    </form>
  );
};
