import { useHotkey } from "@tanstack/react-hotkeys";
import { useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { formatInventoryStockSuffix } from "@/components/inventory/labels";
import type { InventoryOverviewRow } from "@/hooks/use-inventory";
import { useInventoryActions } from "@/hooks/use-inventory";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import {
  invalidQuantityMessage,
  parseNonNegativeInteger,
  parsePositiveIntegerQuantity,
  parseSignedInteger,
} from "@/lib/inventory-form";

type StockOperation = "receive" | "consume" | "sale" | "adjust" | "waste";

const successMessages: Record<StockOperation, string> = {
  receive: "Recepción registrada exitosamente",
  consume: "Consumo registrado exitosamente",
  sale: "Venta registrada exitosamente",
  adjust: "Ajuste registrado exitosamente",
  waste: "Merma registrada exitosamente",
};

interface StockAdjustFormValues {
  quantity: number;
  packageCount: number;
  delta: number;
  counted: number;
  unitCost?: number;
  reason: string;
}

interface UseStockAdjustDialogOptions {
  item: InventoryOverviewRow;
  canManage: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function useStockAdjustDialog({
  item,
  canManage,
  onOpenChange,
}: UseStockAdjustDialogOptions) {
  const haptic = useWebHaptics();

  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const [operation, setOperation] = useState<StockOperation>(
    canManage ? "receive" : "consume",
  );
  const [countMode, setCountMode] = useState<boolean>(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const {
    receiveStockMutation: { mutateAsync: receiveStock },
    adjustStockMutation: { mutateAsync: adjustStock },
    recordConsumptionMutation: { mutateAsync: recordConsumption },
    recordSaleMutation: { mutateAsync: recordSale },
    recordWasteMutation: { mutateAsync: recordWaste },
  } = useInventoryActions();

  // Durable inventory is reusable — it only gets received and corrected.
  const isDurable = item.stockBehavior === "durable";

  const operationOptions: { value: StockOperation; label: string }[] = canManage
    ? isDurable
      ? [
          { value: "receive", label: "Recibir" },
          { value: "adjust", label: "Ajustar" },
        ]
      : [
          { value: "receive", label: "Recibir" },
          { value: "consume", label: "Consumir" },
          ...(item.isSellable
            ? [{ value: "sale" as const, label: "Vender" }]
            : []),
          { value: "adjust", label: "Ajustar" },
          { value: "waste", label: "Merma" },
        ]
    : isDurable
      ? []
      : [
          { value: "consume", label: "Consumir" },
          ...(item.isSellable
            ? [{ value: "sale" as const, label: "Vender" }]
            : []),
        ];

  const defaultValues: StockAdjustFormValues = {
    quantity: 1,
    packageCount: 1,
    delta: 0,
    counted: item.onHand,
    unitCost: undefined,
    reason: "",
  };

  const form = useAppForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const reason = value.reason.trim();

      if (
        (operation === "adjust" || operation === "waste") &&
        reason.length < 3
      ) {
        haptic.trigger("error");
        toast.error("El motivo debe tener al menos 3 caracteres");
        return;
      }

      try {
        switch (operation) {
          case "receive": {
            const quantity = receivePackageMode
              ? parsePositiveIntegerQuantity(value.packageCount)
              : parsePositiveIntegerQuantity(value.quantity);

            if (!quantity) {
              haptic.trigger("error");
              toast.error(invalidQuantityMessage);
              return;
            }

            await receiveStock({
              item: { id: item._id },
              quantity: receivePackageMode
                ? quantity * (item.presentationValue ?? 1)
                : quantity,
              unitCost:
                value.unitCost !== undefined
                  ? Number(value.unitCost)
                  : undefined,
              reason: reason || undefined,
            });
            break;
          }
          case "consume": {
            const quantity = parsePositiveIntegerQuantity(value.quantity);

            if (!quantity) {
              haptic.trigger("error");
              toast.error(invalidQuantityMessage);
              return;
            }

            await recordConsumption({
              item: { id: item._id },
              quantity,
              reason: reason || undefined,
            });
            break;
          }
          case "sale": {
            const quantity = parsePositiveIntegerQuantity(value.quantity);

            if (!quantity) {
              haptic.trigger("error");
              toast.error(invalidQuantityMessage);
              return;
            }

            await recordSale({
              item: { id: item._id },
              quantity,
            });
            break;
          }
          case "adjust":
            if (countMode) {
              const counted = parseNonNegativeInteger(value.counted);

              if (counted === null) {
                haptic.trigger("error");
                toast.error(
                  "Ingresa un conteo físico válido (número entero mayor o igual a 0).",
                );
                return;
              }

              await adjustStock({
                item: { id: item._id },
                absoluteCount: counted,
                reason,
              });
            } else {
              const delta = parseSignedInteger(value.delta);

              if (delta === null) {
                haptic.trigger("error");
                toast.error(
                  "El ajuste debe ser un número entero distinto de cero.",
                );
                return;
              }

              if (delta === 0) {
                haptic.trigger("error");
                toast.error("El ajuste debe ser distinto de cero.");
                return;
              }

              await adjustStock({
                item: { id: item._id },
                delta,
                reason,
              });
            }
            break;
          case "waste": {
            const quantity = parsePositiveIntegerQuantity(value.quantity);

            if (!quantity) {
              haptic.trigger("error");
              toast.error(invalidQuantityMessage);
              return;
            }

            await recordWaste({
              item: { id: item._id },
              quantity,
              reason,
            });
            break;
          }
        }

        haptic.trigger("success");
        toast.success(successMessages[operation]);
        handleOpenChange(false);
      } catch (error) {
        haptic.trigger("error");
        toast.error(getConvexErrorMessage(error));
        return;
      }
    },
  });

  useHotkey(
    "Control+Enter",
    () => {
      if (!internalOpen) {
        return;
      }

      form.handleSubmit();
    },
    {
      preventDefault: true,
      stopPropagation: true,
    },
  );

  const unitSuffix = formatInventoryStockSuffix(item.onHand, item.unit);
  const presentationSuffix =
    item.presentationUnit === "und" ? "und" : item.presentationUnit;
  const canReceiveByPackage =
    operation === "receive" &&
    typeof item.presentationValue === "number" &&
    item.presentationValue > 0 &&
    item.presentationUnit !== undefined &&
    ((item.unit === "ml" && item.presentationUnit === "ml") ||
      (item.unit === "g" && item.presentationUnit === "g") ||
      (item.unit === "unit" && item.presentationUnit === "und"));
  const [receivePackageMode, setReceivePackageMode] =
    useState<boolean>(canReceiveByPackage);

  return {
    form,
    haptic,
    internalOpen,
    handleOpenChange,
    operation,
    setOperation,
    countMode,
    setCountMode,
    receivePackageMode,
    setReceivePackageMode,
    canReceiveByPackage,
    presentationSuffix,
    operationOptions,
    unitSuffix,
    reasonRequired: operation === "adjust" || operation === "waste",
    showQuantity: operation !== "adjust",
    showCountedField: operation === "adjust" && countMode,
    showDeltaField: operation === "adjust" && !countMode,
  };
}

export type StockAdjustDialogState = ReturnType<typeof useStockAdjustDialog>;
