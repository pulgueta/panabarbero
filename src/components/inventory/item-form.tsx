import { inventoryCategories, inventoryUnits } from "@convex/schema";
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

import {
  inventoryCategoryLabels,
  inventoryUnitLabels,
  inventoryUnitSuffixes,
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
import { useItemForm } from "./use-item-form";

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

export const ItemForm: FC<ItemFormProps> = (props) => {
  const { itemId } = props;
  const engine = useItemForm(props);
  const { form, photoFile } = engine;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="w-full space-y-4"
    >
      <ItemFormFields engine={engine} itemId={itemId} />

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

interface ItemFormFieldsProps {
  engine: ItemFormEngine;
  itemId?: ItemFormProps["itemId"];
}

export const ItemFormFields: FC<ItemFormFieldsProps> = ({ engine, itemId }) => {
  const { form } = engine;

  return (
    <FieldGroup>
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

      {!itemId && (
        <form.Subscribe selector={(state) => state.values.unit}>
          {(unit) => (
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
        </form.Subscribe>
      )}

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

      <InventoryImageField engine={engine} />
    </FieldGroup>
  );
};

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
