import { inventoryCategories, inventoryUnits } from "@convex/schema";
import { PackageIcon } from "@phosphor-icons/react";
import type { FC } from "react";

import {
  inventoryCategoryLabels,
  inventoryUnitLabels,
} from "@/components/inventory/labels";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ItemFormData, ItemFormProps } from "./use-item-form";
import { useItemForm } from "./use-item-form";

export type { ItemFormData };

const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,image/avif";

export const ItemForm: FC<ItemFormProps> = (props) => {
  const { itemId } = props;
  const { form, imageUrl, photoFile, setPhotoFile, isUploading } =
    useItemForm(props);

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
