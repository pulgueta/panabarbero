import type {
  Barbershop,
  InventoryCategory,
  InventoryItem,
  InventoryPresentationUnit,
  InventoryStockBehavior,
  InventoryUnit,
} from "@convex/schema";
import { inventoryItems, isEquipmentCategory } from "@convex/schema";
import { revalidateLogic } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { useFormStepper } from "@/components/form/use-form-stepper";
import { useInventoryActions } from "@/hooks/use-inventory";
import { getLogoUrl, useUpload } from "@/hooks/use-upload";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import {
  parseMoneyAmount,
  parseNonNegativeInteger,
  parsePositiveIntegerQuantity,
} from "@/lib/inventory-form";

export interface ItemFormData {
  barbershopId: Barbershop["_id"];
  name: string;
  sku?: string;
  category: InventoryCategory;
  unit: InventoryUnit;
  stockBehavior: InventoryStockBehavior;
  brand?: string;
  supplier?: string;
  customLabel?: string;
  /** What one purchasable package contains ("frasco de 500 ml"). */
  presentationValue?: number;
  presentationUnit?: InventoryPresentationUnit;
  /** Equipment sheet (máquinas/herramientas). */
  model?: string;
  serialNumber?: string;
  /**
   * Dates live as "YYYY-MM-DD" strings in the form (native date inputs) and
   * convert to ms on submit. Named apart from the schema keys so the zod
   * validators skip them as unknown keys.
   */
  purchasedAtDate?: string;
  warrantyUntilDate?: string;
  notes?: string;
  isSellable: boolean;
  /** Optional in the form so a cleared input is representable; submit falls back. */
  unitCost?: number;
  salePrice?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  allowNegativeStock: boolean;
  /** Create only: optional starting stock, applied as a "receipt" movement. */
  initialQuantity?: number;
}

export function toDateInputValue(timestamp?: number): string | undefined {
  if (timestamp === undefined) return undefined;
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Local-noon anchor keeps the calendar day stable across timezones. */
function fromDateInputValue(value?: string): number | undefined {
  if (!value) return undefined;
  const timestamp = new Date(`${value}T12:00:00`).getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

/**
 * Wizard steps: each is a slice of the table schema. Create validates the
 * slice against `insertSchema` (required fields stay required per step);
 * edit validates against `updateSchema` (everything optional), so any step
 * can be reached and saved directly.
 */
export const itemFormSteps = [
  { label: "Producto" },
  { label: "Detalles" },
  { label: "Manejo" },
  { label: "Foto" },
];

const STEP_ONE_FIELDS = {
  name: true,
  category: true,
  unit: true,
  presentationValue: true,
  presentationUnit: true,
} as const;

const STEP_TWO_FIELDS = {
  unitCost: true,
  sku: true,
  stockBehavior: true,
  brand: true,
  supplier: true,
  customLabel: true,
} as const;

const STEP_THREE_FIELDS = {
  isSellable: true,
  salePrice: true,
  reorderPoint: true,
  reorderQuantity: true,
  allowNegativeStock: true,
  model: true,
  serialNumber: true,
  notes: true,
} as const;

const STEP_FOUR_FIELDS = { imageKey: true } as const;

const createStepSchemas = [
  inventoryItems.insertSchema.pick(STEP_ONE_FIELDS),
  inventoryItems.insertSchema.pick(STEP_TWO_FIELDS),
  inventoryItems.insertSchema.pick(STEP_THREE_FIELDS),
  inventoryItems.insertSchema.pick(STEP_FOUR_FIELDS),
];

const editStepSchemas = [
  inventoryItems.updateSchema.pick(STEP_ONE_FIELDS),
  inventoryItems.updateSchema.pick(STEP_TWO_FIELDS),
  inventoryItems.updateSchema.pick(STEP_THREE_FIELDS),
  inventoryItems.updateSchema.pick(STEP_FOUR_FIELDS),
];

export interface ItemFormProps {
  initialValues?: ItemFormData;
  barbershopId: Barbershop["_id"];
  itemId?: InventoryItem["_id"];
  currentImageKey?: string;
  /** Edit only: live stock, so the form can warn when a unit switch would reinterpret it. */
  currentOnHand?: number;
  onSuccess?: () => void;
}

export function useItemForm({
  initialValues,
  barbershopId,
  itemId,
  currentImageKey,
  currentOnHand,
  onSuccess,
}: ItemFormProps) {
  const haptic = useWebHaptics();

  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const {
    uploadFile: { isUploading, uploadFile },
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
    stockBehavior: "consumable",
    brand: undefined,
    supplier: undefined,
    customLabel: undefined,
    presentationValue: undefined,
    presentationUnit: "ml",
    model: undefined,
    serialNumber: undefined,
    purchasedAtDate: undefined,
    warrantyUntilDate: undefined,
    notes: undefined,
    isSellable: false,
    unitCost: 0,
    salePrice: undefined,
    reorderPoint: 0,
    reorderQuantity: undefined,
    allowNegativeStock: false,
    initialQuantity: undefined,
  };

  // Edit navigates freely (updateSchema slices are all-optional); create
  // moves forward only through the validating "Siguiente".
  const stepper = useFormStepper(itemId ? editStepSchemas : createStepSchemas, {
    freeNavigation: itemId !== undefined,
  });

  const form = useAppForm({
    onSubmitInvalid: () => {
      haptic.trigger("error");
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      // @ts-expect-error - the step schema is a slice of the form values
      onDynamic: stepper.currentValidator,
    },
    defaultValues,
    onSubmit: async ({ value }) => {
      try {
        let imageKey = currentImageKey;

        if (photoFile) {
          imageKey = await uploadFile(photoFile);
        }

        const isDurable = value.stockBehavior === "durable";
        const categoryDefaultsToDurable = isEquipmentCategory(value.category);
        const stockBehavior: InventoryStockBehavior = isDurable
          ? "durable"
          : categoryDefaultsToDurable
            ? "durable"
            : "consumable";
        // Presentation describes the purchasable package behind base stock
        // math: e.g. a 500 ml bottle received into ml stock.
        const presentationValue =
          stockBehavior !== "durable"
            ? (parsePositiveIntegerQuantity(value.presentationValue ?? "") ??
              undefined)
            : undefined;

        const data = {
          barbershopId,
          name: value.name,
          sku: value.sku || undefined,
          category: value.category,
          unit: value.unit,
          stockBehavior,
          brand: value.brand?.trim() || undefined,
          supplier: value.supplier?.trim() || undefined,
          customLabel: value.customLabel?.trim() || undefined,
          presentationValue,
          presentationUnit:
            presentationValue !== undefined
              ? (value.presentationUnit ?? "ml")
              : undefined,
          model:
            stockBehavior === "durable"
              ? value.model?.trim() || undefined
              : undefined,
          serialNumber:
            stockBehavior === "durable"
              ? value.serialNumber?.trim() || undefined
              : undefined,
          purchasedAt:
            stockBehavior === "durable"
              ? fromDateInputValue(value.purchasedAtDate)
              : undefined,
          warrantyUntil:
            stockBehavior === "durable"
              ? fromDateInputValue(value.warrantyUntilDate)
              : undefined,
          notes: value.notes?.trim() || undefined,
          isSellable: stockBehavior === "durable" ? false : value.isSellable,
          unitCost:
            parseMoneyAmount(value.unitCost ?? "") ??
            (itemId ? (initialValues?.unitCost ?? 0) : 0),
          salePrice:
            stockBehavior !== "durable" &&
            value.isSellable &&
            value.salePrice !== undefined
              ? (parseMoneyAmount(value.salePrice) ?? undefined)
              : undefined,
          reorderPoint:
            parseNonNegativeInteger(value.reorderPoint ?? "") ??
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

  // Native form submits (Enter, submit buttons) route here: create advances
  // step by step so a premature Enter can't insert a half-filled product;
  // edit saves straight from whichever step is open.
  const handlePrimaryAction = () => {
    if (itemId) {
      void form.handleSubmit();
      return;
    }

    void stepper.handleNextStepOrSubmit(form);
  };

  useHotkey("Control+Enter", handlePrimaryAction, {
    preventDefault: true,
    stopPropagation: true,
  });

  const imageUrl = getLogoUrl(currentImageKey);

  return {
    form,
    stepper,
    handlePrimaryAction,
    imageUrl,
    photoFile,
    setPhotoFile,
    isUploading,
    initialUnit: initialValues?.unit,
    currentOnHand,
  };
}
