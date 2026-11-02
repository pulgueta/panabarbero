import { inventoryPresentationUnits, inventoryUnits } from "@convex/schema";
import {
  CameraIcon,
  PackageIcon,
  TrashIcon,
  UploadIcon,
} from "@phosphor-icons/react";
import type { FC } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";
import { FormStepper } from "@/components/form/form-stepper";
import {
  inventoryCategoryGroups,
  inventoryCategoryLabels,
  inventoryPresentationUnitLabels,
  inventoryStockBehaviorLabels,
  inventoryUnitLabels,
  inventoryUnitSuffixes,
  isEquipmentCategory,
} from "@/components/inventory/labels";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  type FileUploadProps,
} from "@/components/ui/file-upload";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { cn } from "@/lib/utils";

import type { ItemFormData, ItemFormProps } from "./use-item-form";
import { itemFormSteps, useItemForm } from "./use-item-form";

export type { ItemFormData };

const ACCEPTED_TYPES = "image/png,image/jpeg,image/webp,image/avif";
const MAX_ITEM_IMAGE_SIZE = 5 * 1024 * 1024;
const ITEM_IMAGE_ASPECT_RATIOS = [
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "16:9", value: 16 / 9 },
];

/** The full form engine — lifted so a dedicated page can compose fields + live preview. */
export type ItemFormEngine = ReturnType<typeof useItemForm>;

/** Shared by every numeric field: an emptied input maps to `undefined`, not `NaN`. */
function toOptionalNumber(raw: string): number | undefined {
  return raw === "" ? undefined : Number(raw);
}

/** Grouped order (Venta → Insumos → Equipo → Otro); the enum stays flat. */
const categoryOptions = inventoryCategoryGroups.flatMap((group) =>
  group.categories.map((category) => ({
    value: category,
    label: inventoryCategoryLabels[category],
  })),
);

export const ItemForm: FC<ItemFormProps> = (props) => {
  const { itemId } = props;
  const engine = useItemForm(props);
  const { handlePrimaryAction } = engine;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handlePrimaryAction();
      }}
      className="w-full space-y-4"
    >
      <ItemFormFields engine={engine} itemId={itemId} />

      <div className="flex items-center justify-end gap-3">
        <ItemFormStepActions
          engine={engine}
          itemId={itemId}
          submitLabel="Guardar"
        />
      </div>
    </form>
  );
};

interface ItemFormFieldsProps {
  engine: ItemFormEngine;
  itemId?: ItemFormProps["itemId"];
}

export const ItemFormFields: FC<ItemFormFieldsProps> = ({ engine, itemId }) => {
  const { form, stepper, initialUnit, currentOnHand } = engine;

  return (
    <FieldGroup>
      <FormStepper
        steps={itemFormSteps}
        currentStep={stepper.currentStep}
        onSelectStep={stepper.goToStep}
        canSelectStep={stepper.canGoToStep}
      />

      {stepper.currentStep === 1 && (
        <>
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label="Nombre del producto"
                placeholder="Cuchillas dobles"
              />
            )}
          </form.AppField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <form.AppField name="category">
              {(field) => (
                <field.SelectField
                  label="Categoría"
                  className="w-full"
                  options={categoryOptions}
                />
              )}
            </form.AppField>

            <form.AppField name="unit">
              {(field) => (
                <field.SelectField
                  label="¿Cómo cuentas el stock?"
                  className="w-full"
                  options={inventoryUnits.map((unit) => ({
                    value: unit,
                    label: inventoryUnitLabels[unit],
                  }))}
                />
              )}
            </form.AppField>
          </div>

          <form.Subscribe selector={(state) => state.values.category}>
            {(category) => (
              <ItemUnitFields
                form={form}
                itemId={itemId}
                categoryDefaultsToDurable={isEquipmentCategory(category)}
                initialUnit={initialUnit}
                currentOnHand={currentOnHand}
              />
            )}
          </form.Subscribe>
        </>
      )}

      {stepper.currentStep === 2 && (
        <form.Subscribe selector={(state) => state.values.category}>
          {(category) => (
            <ItemDetailsFields
              form={form}
              categoryDefaultsToDurable={isEquipmentCategory(category)}
            />
          )}
        </form.Subscribe>
      )}

      {stepper.currentStep === 3 && (
        <form.Subscribe selector={(state) => state.values.category}>
          {(category) => {
            const categoryDefaultsToDurable = isEquipmentCategory(category);

            return (
              <form.Subscribe selector={(state) => state.values.stockBehavior}>
                {(stockBehavior) => {
                  const isDurable =
                    stockBehavior === "durable" || categoryDefaultsToDurable;

                  return isDurable ? (
                    <ItemDurableFields form={form} />
                  ) : (
                    <ItemStockPolicyFields form={form} />
                  );
                }}
              </form.Subscribe>
            );
          }}
        </form.Subscribe>
      )}

      {stepper.currentStep === 4 && <InventoryImageField engine={engine} />}
    </FieldGroup>
  );
};

/**
 * Wizard footer: Anterior/Siguiente to browse steps; the submit button shows
 * on every step when editing (any step can be saved directly) and only on the
 * last step when creating.
 */
export const ItemFormStepActions: FC<{
  engine: ItemFormEngine;
  itemId?: ItemFormProps["itemId"];
  submitLabel: string;
}> = ({ engine, itemId, submitLabel }) => {
  const { form, stepper, photoFile } = engine;
  const isEdit = itemId !== undefined;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={stepper.isFirstStep}
        onClick={stepper.goToPrevStep}
      >
        Anterior
      </Button>

      {!stepper.isLastStep && (
        <Button
          type="button"
          variant={isEdit ? "outline" : "default"}
          onClick={() => void stepper.handleNextStepOrSubmit(form)}
        >
          Siguiente
        </Button>
      )}

      {(isEdit || stepper.isLastStep) && (
        <form.AppForm>
          <form.SubmitButton
            label={submitLabel}
            forceEnabled={photoFile !== null}
          />
        </form.AppForm>
      )}
    </>
  );
};

interface ItemSectionFieldsProps {
  form: ItemFormEngine["form"];
}

/** Counting-unit semantics: granel helper, presentation, starting stock. */
const ItemUnitFields: FC<
  ItemSectionFieldsProps & {
    itemId?: ItemFormProps["itemId"];
    categoryDefaultsToDurable: boolean;
    initialUnit?: ItemFormData["unit"];
    currentOnHand?: number;
  }
> = ({
  form,
  itemId,
  categoryDefaultsToDurable,
  initialUnit,
  currentOnHand,
}) => (
  <form.Subscribe selector={(state) => state.values.unit}>
    {(unit) => (
      <>
        {/* A unit switch keeps the stored number and changes its meaning —
            say so before the save reinterprets real stock. */}
        {itemId &&
          initialUnit &&
          unit !== initialUnit &&
          (currentOnHand ?? 0) !== 0 && (
            <p className="font-medium text-sm text-warning">
              {`Tu stock actual de ${currentOnHand} ${inventoryUnitSuffixes[initialUnit]} pasará a contarse como ${currentOnHand} ${inventoryUnitSuffixes[unit]} al guardar. Verifica que la cantidad siga siendo correcta.`}
            </p>
          )}

        {(unit === "ml" || unit === "g") && (
          <p className="text-muted-foreground text-sm">
            {`El stock se contará en ${unit === "ml" ? "mililitros" : "gramos"} totales — una botella de 500 ${unit} son 500 ${unit}. Registra el contenido por envase para recibir por botellas sin hacer la conversión manual.`}
          </p>
        )}

        {!categoryDefaultsToDurable && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <form.AppField name="presentationValue">
              {(field) => (
                <field.TextField
                  label={
                    unit === "ml" || unit === "g"
                      ? "Contenido por envase"
                      : "Contenido por unidad"
                  }
                  description="Opcional. Ej: 500 para un frasco de 500 ml, 100 para una caja x 100."
                  placeholder="500"
                  type="number"
                  className="w-full tabular-nums"
                  value={field.state.value ?? ""}
                  onChange={(e) =>
                    field.handleChange(toOptionalNumber(e.target.value))
                  }
                />
              )}
            </form.AppField>

            <form.AppField name="presentationUnit">
              {(field) => (
                <field.SelectField
                  label="Unidad del contenido"
                  className="w-full"
                  options={inventoryPresentationUnits.map(
                    (presentationUnit) => ({
                      value: presentationUnit,
                      label: inventoryPresentationUnitLabels[presentationUnit],
                    }),
                  )}
                />
              )}
            </form.AppField>
          </div>
        )}

        {!itemId && (
          <form.AppField name="initialQuantity">
            {(field) => (
              <field.AddonField
                label="Cantidad inicial"
                description="Opcional. Stock con el que inicia el producto — puedes registrarlo después."
                placeholder="0"
                type="number"
                addonEnd={inventoryUnitSuffixes[unit]}
                className="tabular-nums"
                value={field.state.value ?? ""}
                onChange={(e) =>
                  field.handleChange(toOptionalNumber(e.target.value))
                }
              />
            )}
          </form.AppField>
        )}
      </>
    )}
  </form.Subscribe>
);

/** Cost, SKU, brand and supplier — shared by every category. */
const ItemDetailsFields: FC<
  ItemSectionFieldsProps & { categoryDefaultsToDurable: boolean }
> = ({ form, categoryDefaultsToDurable }) => (
  <>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <form.AppField name="unitCost">
        {(field) => (
          <field.AddonField
            label="Costo unitario"
            addonStart="COP"
            placeholder="5000"
            type="number"
            className="tabular-nums"
            value={field.state.value ?? ""}
            onChange={(e) =>
              field.handleChange(toOptionalNumber(e.target.value))
            }
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
            onChange={(e) => field.handleChange(e.target.value || undefined)}
          />
        )}
      </form.AppField>
    </div>

    {categoryDefaultsToDurable ? (
      <div className="space-y-1">
        <p className="font-medium text-sm">Tipo de manejo</p>
        <p className="text-muted-foreground text-sm">
          {inventoryStockBehaviorLabels.durable}
        </p>
      </div>
    ) : (
      <form.AppField name="stockBehavior">
        {(field) => (
          <field.SelectField
            label="Tipo de manejo"
            className="w-full"
            options={Object.entries(inventoryStockBehaviorLabels).map(
              ([value, label]) => ({ value, label }),
            )}
          />
        )}
      </form.AppField>
    )}

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <form.AppField name="brand">
        {(field) => (
          <field.TextField
            label="Marca"
            description="Opcional"
            placeholder="Wahl"
            className="w-full"
            value={field.state.value ?? ""}
            onChange={(e) => field.handleChange(e.target.value || undefined)}
          />
        )}
      </form.AppField>

      <form.AppField name="supplier">
        {(field) => (
          <field.TextField
            label="Proveedor"
            description="Opcional"
            placeholder="Distribuidora XYZ"
            className="w-full"
            value={field.state.value ?? ""}
            onChange={(e) => field.handleChange(e.target.value || undefined)}
          />
        )}
      </form.AppField>
    </div>

    <form.AppField name="customLabel">
      {(field) => (
        <field.TextField
          label="Etiqueta personalizada"
          description="Opcional. Ej: color, barbería café, spa, uniformes."
          placeholder="Colorimetría"
          className="w-full"
          value={field.state.value ?? ""}
          onChange={(e) => field.handleChange(e.target.value || undefined)}
        />
      )}
    </form.AppField>
  </>
);

/** Durable sheet: identity + lifecycle for máquinas, herramientas y textiles reutilizables. */
const ItemDurableFields: FC<ItemSectionFieldsProps> = ({ form }) => (
  <>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <form.AppField name="model">
        {(field) => (
          <field.TextField
            label="Modelo"
            description="Opcional"
            placeholder="Magic Clip Cordless"
            className="w-full"
            value={field.state.value ?? ""}
            onChange={(e) => field.handleChange(e.target.value || undefined)}
          />
        )}
      </form.AppField>

      <form.AppField name="serialNumber">
        {(field) => (
          <field.TextField
            label="N.º de serie"
            description="Opcional"
            placeholder="SN-102938"
            className="w-full"
            value={field.state.value ?? ""}
            onChange={(e) => field.handleChange(e.target.value || undefined)}
          />
        )}
      </form.AppField>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <form.AppField name="purchasedAtDate">
        {(field) => (
          <field.TextField
            label="Fecha de compra"
            description="Opcional"
            type="date"
            className="w-full"
            value={field.state.value ?? ""}
            onChange={(e) => field.handleChange(e.target.value || undefined)}
          />
        )}
      </form.AppField>

      <form.AppField name="warrantyUntilDate">
        {(field) => (
          <field.TextField
            label="Garantía hasta"
            description="Opcional"
            type="date"
            className="w-full"
            value={field.state.value ?? ""}
            onChange={(e) => field.handleChange(e.target.value || undefined)}
          />
        )}
      </form.AppField>
    </div>

    <p className="text-muted-foreground text-sm">
      Los productos durables no se consumen ni se venden: solo se reciben y se
      ajustan. No aparecen en los insumos de servicios.
    </p>

    <form.AppField name="notes">
      {(field) => (
        <field.TextField
          label="Notas"
          description="Opcional"
          placeholder="Estado, ubicación o cuidado especial"
          className="w-full"
          value={field.state.value ?? ""}
          onChange={(e) => field.handleChange(e.target.value || undefined)}
        />
      )}
    </form.AppField>
  </>
);

/** Reorder alerts and selling policy for stock-tracked products. */
const ItemStockPolicyFields: FC<ItemSectionFieldsProps> = ({ form }) => (
  <>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <form.AppField name="reorderPoint">
        {(field) => (
          <field.TextField
            label="Punto de pedido"
            description="Alerta de bajo stock"
            placeholder="5"
            type="number"
            className="w-full tabular-nums"
            value={field.state.value ?? ""}
            onChange={(e) =>
              field.handleChange(toOptionalNumber(e.target.value))
            }
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
              field.handleChange(toOptionalNumber(e.target.value))
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
              <field.AddonField
                label="Precio de venta"
                addonStart="COP"
                placeholder="30000"
                type="number"
                className="tabular-nums"
                value={field.state.value ?? ""}
                onChange={(e) =>
                  field.handleChange(toOptionalNumber(e.target.value))
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
  </>
);

const InventoryImageField: FC<{ engine: ItemFormEngine }> = ({ engine }) => {
  const { imageUrl, photoFile, setPhotoFile, isUploading } = engine;
  const [fileToCrop, setFileToCrop] = useState<File | null>(null);
  const { trigger } = useWebHaptics();

  const queuedFiles = useMemo(
    () => (photoFile ? [photoFile] : []),
    [photoFile],
  );
  const previewUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : imageUrl),
    [photoFile, imageUrl],
  );

  useEffect(() => {
    return () => {
      if (photoFile && previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [photoFile, previewUrl]);

  const onFileReject = useCallback<
    NonNullable<FileUploadProps["onFileReject"]>
  >(
    (_file, message) => {
      toast.error(message);
      trigger("warning");
    },
    [trigger],
  );

  const handleValueChange = useCallback(
    (files: File[]) => {
      const nextFile = files[0] ?? null;

      if (!nextFile) {
        setPhotoFile(null);
        return;
      }

      if (nextFile !== photoFile) {
        setFileToCrop(nextFile);
      }
    },
    [photoFile, setPhotoFile],
  );

  const handleCropConfirm = useCallback(
    (croppedFile: File) => {
      setFileToCrop(null);
      setPhotoFile(croppedFile);
    },
    [setPhotoFile],
  );

  const handleCropCancel = useCallback(() => {
    setFileToCrop(null);
  }, []);

  return (
    <div className="space-y-3">
      <ImageCropDialog
        file={fileToCrop}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
        aspectRatio={1}
        aspectRatioOptions={ITEM_IMAGE_ASPECT_RATIOS}
      />

      <FileUpload
        value={queuedFiles}
        onValueChange={handleValueChange}
        maxFiles={1}
        maxSize={MAX_ITEM_IMAGE_SIZE}
        accept={ACCEPTED_TYPES}
        disabled={isUploading}
        onFileReject={onFileReject}
        onFileValidate={(file) => {
          if (file.size > MAX_ITEM_IMAGE_SIZE) {
            return "El archivo no debe superar 5 MB";
          }
          if (!ACCEPTED_TYPES.split(",").includes(file.type)) {
            return "Solo se permiten imágenes PNG, JPG, WebP o AVIF";
          }
          return null;
        }}
      >
        <FileUploadDropzone
          className={cn(
            "group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-5 transition-all",
            "hover:bg-accent/20",
            isUploading && "pointer-events-none opacity-60",
          )}
        >
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Foto del producto"
                className="size-full object-cover"
              />
            ) : (
              <CameraIcon className="size-7 text-muted-foreground/50" />
            )}
          </div>

          <div className="text-center">
            <p className="font-medium text-sm">
              {previewUrl
                ? "Arrastra una imagen para reemplazar la foto"
                : "Arrastra o selecciona una foto del producto"}
            </p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              Recorta en 1:1, 4:3, 3:2 o 16:9. PNG, JPG, WebP o AVIF, máx. 5 MB
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            className="pointer-events-none"
          >
            <UploadIcon className="size-3.5" />
            {previewUrl ? "Cambiar foto" : "Subir foto"}
          </Button>
        </FileUploadDropzone>

        <FileUploadList>
          {queuedFiles.map((file) => (
            <FileUploadItem key={file.name + file.size} value={file}>
              <FileUploadItemPreview />
              <FileUploadItemMetadata size="sm" />
              <FileUploadItemDelete asChild>
                <Button type="button" variant="destructive" size="icon">
                  <TrashIcon />
                </Button>
              </FileUploadItemDelete>
            </FileUploadItem>
          ))}
        </FileUploadList>
      </FileUpload>

      {!previewUrl && (
        <p className="flex items-center gap-2 text-muted-foreground text-xs">
          <PackageIcon className="size-3.5" />
          La foto se mostrará en la tarjeta y la tabla de inventario.
        </p>
      )}
    </div>
  );
};
