import { useHotkey } from "@tanstack/react-hotkeys";
import { useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { inventoryUnitSuffixes } from "@/components/inventory/labels";
import type { InventoryOverviewRow } from "@/hooks/use-inventory";
import { useInventoryActions } from "@/hooks/use-inventory";
import { getConvexErrorMessage } from "@/lib/convex-errors";

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

  const operationOptions: { value: StockOperation; label: string }[] = canManage
    ? [
        { value: "receive", label: "Recibir" },
        { value: "consume", label: "Consumir" },
        ...(item.isSellable
          ? [{ value: "sale" as const, label: "Vender" }]
          : []),
        { value: "adjust", label: "Ajustar" },
        { value: "waste", label: "Merma" },
      ]
    : [
        { value: "consume", label: "Consumir" },
        ...(item.isSellable
          ? [{ value: "sale" as const, label: "Vender" }]
          : []),
      ];

  const defaultValues: StockAdjustFormValues = {
    quantity: 1,
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
          case "receive":
            await receiveStock({
              item: { id: item._id },
              quantity: Number(value.quantity),
              unitCost:
                value.unitCost !== undefined
                  ? Number(value.unitCost)
                  : undefined,
              reason: reason || undefined,
            });
            break;
          case "consume":
            await recordConsumption({
              item: { id: item._id },
              quantity: Number(value.quantity),
              reason: reason || undefined,
            });
            break;
          case "sale":
            await recordSale({
              item: { id: item._id },
              quantity: Number(value.quantity),
            });
            break;
          case "adjust":
            if (countMode) {
              await adjustStock({
                item: { id: item._id },
                absoluteCount: Number(value.counted),
                reason,
              });
            } else {
              await adjustStock({
                item: { id: item._id },
                delta: Number(value.delta),
                reason,
              });
            }
            break;
          case "waste":
            await recordWaste({
              item: { id: item._id },
              quantity: Number(value.quantity),
              reason,
            });
            break;
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

  useHotkey("Control+Enter", () => form.handleSubmit(), {
    preventDefault: true,
    stopPropagation: true,
  });

  const unitSuffix = inventoryUnitSuffixes[item.unit];

  return {
    form,
    haptic,
    internalOpen,
    handleOpenChange,
    operation,
    setOperation,
    countMode,
    setCountMode,
    operationOptions,
    unitSuffix,
    reasonRequired: operation === "adjust" || operation === "waste",
    showQuantity: operation !== "adjust",
    showCountedField: operation === "adjust" && countMode,
    showDeltaField: operation === "adjust" && !countMode,
  };
}

export type StockAdjustDialogState = ReturnType<typeof useStockAdjustDialog>;
