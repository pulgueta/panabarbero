import type {
  Barbershop,
  InventoryCategory,
  InventoryItem,
  InventoryUnit,
} from "@convex/schema";
import { inventoryItems } from "@convex/schema";
import { revalidateLogic } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { useInventoryActions } from "@/hooks/use-inventory";
import { getLogoUrl, useUpload } from "@/hooks/use-upload";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import {
  parseNonNegativeInteger,
  parsePositiveIntegerQuantity,
} from "@/lib/inventory-form";

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
  /** Create only: optional starting stock, applied as a "receipt" movement. */
  initialQuantity?: number;
}

export interface ItemFormProps {
  initialValues?: ItemFormData;
  barbershopId: Barbershop["_id"];
  itemId?: InventoryItem["_id"];
  currentImageKey?: string;
  onSuccess?: () => void;
}

export function useItemForm({
  initialValues,
  barbershopId,
  itemId,
  currentImageKey,
  onSuccess,
}: ItemFormProps) {
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
    initialQuantity: undefined,
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
          await createItem({
            ...data,
            initialQuantity:
              value.initialQuantity !== undefined
                ? (parsePositiveIntegerQuantity(value.initialQuantity) ??
                  undefined)
                : undefined,
          });

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

  return { form, imageUrl, photoFile, setPhotoFile, isUploading };
}
