import { useHotkey } from "@tanstack/react-hotkeys";
import type { FC, ReactElement } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { inventoryUnitSuffixes } from "@/components/inventory/labels";
import { FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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

interface StockAdjustDialogProps {
  item: InventoryOverviewRow;
  /** Managers get every operation; barbers only consume/sale. */
  canManage: boolean;
  trigger: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const StockAdjustDialog: FC<StockAdjustDialogProps> = ({
  item,
  canManage,
  trigger,
  open,
  onOpenChange,
}) => {
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
  const reasonRequired = operation === "adjust" || operation === "waste";
  const showQuantity = operation !== "adjust";
  const showCountedField = operation === "adjust" && countMode;
  const showDeltaField = operation === "adjust" && !countMode;

  return (
    <ResponsiveModal
      open={open ?? internalOpen}
      onOpenChange={handleOpenChange}
    >
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            {canManage ? "Ajustar stock" : "Registrar uso o venta"}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {`Registra movimientos de "${item.name}". Stock actual: ${item.onHand} ${unitSuffix}.`}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalFooter>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="w-full space-y-4"
          >
            <FieldGroup>
              <div className="space-y-2">
                <Label htmlFor="stock-operation">Operación</Label>
                <Select
                  value={operation}
                  onValueChange={(value) =>
                    setOperation(value as StockOperation)
                  }
                >
                  <SelectTrigger id="stock-operation" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showQuantity && (
                <form.AppField name="quantity">
                  {(field) => (
                    <field.TextField
                      label="Cantidad"
                      description={`En ${unitSuffix}`}
                      type="number"
                      min={1}
                      className="w-full tabular-nums"
                    />
                  )}
                </form.AppField>
              )}

              {operation === "receive" && (
                <form.AppField name="unitCost">
                  {(field) => (
                    <field.TextField
                      label="Costo unitario"
                      description="Opcional — actualiza el costo promedio"
                      placeholder="5000"
                      type="number"
                      min={0}
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
              )}

              {operation === "adjust" && (
                <div className="flex items-center gap-3">
                  <Switch
                    id="stock-count-mode"
                    checked={countMode}
                    onCheckedChange={(checked) => {
                      haptic.trigger("selection");
                      setCountMode(checked);
                    }}
                  />
                  <Label htmlFor="stock-count-mode">Fijar conteo físico</Label>
                </div>
              )}

              {showDeltaField && (
                <form.AppField name="delta">
                  {(field) => (
                    <field.TextField
                      label="Ajuste"
                      description="Positivo suma, negativo resta"
                      type="number"
                      className="w-full tabular-nums"
                    />
                  )}
                </form.AppField>
              )}

              {showCountedField && (
                <>
                  <form.AppField name="counted">
                    {(field) => (
                      <field.TextField
                        label="Conteo físico"
                        description={`En ${unitSuffix}`}
                        type="number"
                        min={0}
                        className="w-full tabular-nums"
                      />
                    )}
                  </form.AppField>

                  <form.Subscribe selector={(state) => state.values.counted}>
                    {(counted) => {
                      const difference = Number(counted) - item.onHand;

                      return (
                        <p className="text-muted-foreground text-sm tabular-nums">
                          Diferencia:{" "}
                          {difference > 0 ? `+${difference}` : difference}{" "}
                          {unitSuffix}
                        </p>
                      );
                    }}
                  </form.Subscribe>
                </>
              )}

              {operation !== "sale" && (
                <form.AppField name="reason">
                  {(field) => (
                    <field.TextField
                      label="Motivo"
                      description={reasonRequired ? "Requerido" : "Opcional"}
                      placeholder="Conteo mensual"
                      className="w-full"
                    />
                  )}
                </form.AppField>
              )}
            </FieldGroup>

            <form.AppForm>
              <form.SubmitButton label="Registrar" className="w-full" />
            </form.AppForm>
          </form>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
