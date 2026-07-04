import type { FC } from "react";

import { FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { InventoryOverviewRow } from "@/hooks/use-inventory";

import type { StockAdjustDialogState } from "./use-stock-adjust-dialog";

interface StockAdjustFormFieldsProps {
  item: InventoryOverviewRow;
  form: StockAdjustDialogState["form"];
  haptic: StockAdjustDialogState["haptic"];
  operation: StockAdjustDialogState["operation"];
  setOperation: StockAdjustDialogState["setOperation"];
  countMode: StockAdjustDialogState["countMode"];
  setCountMode: StockAdjustDialogState["setCountMode"];
  operationOptions: StockAdjustDialogState["operationOptions"];
  unitSuffix: StockAdjustDialogState["unitSuffix"];
  reasonRequired: StockAdjustDialogState["reasonRequired"];
  showQuantity: StockAdjustDialogState["showQuantity"];
  showCountedField: StockAdjustDialogState["showCountedField"];
  showDeltaField: StockAdjustDialogState["showDeltaField"];
}

export const StockAdjustFormFields: FC<StockAdjustFormFieldsProps> = ({
  item,
  form,
  haptic,
  operation,
  setOperation,
  countMode,
  setCountMode,
  operationOptions,
  unitSuffix,
  reasonRequired,
  showQuantity,
  showCountedField,
  showDeltaField,
}) => (
  <FieldGroup>
    <div className="space-y-2">
      <Label htmlFor="stock-operation">Operación</Label>
      <Select
        value={operation}
        onValueChange={(value) =>
          setOperation(value as StockAdjustDialogState["operation"])
        }
      >
        <SelectTrigger id="stock-operation" className="w-full">
          <SelectValue>
            {operationOptions.find((option) => option.value === operation)
              ?.label ?? "Selecciona una operación"}
          </SelectValue>
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
                e.target.value === "" ? undefined : Number(e.target.value),
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
                Diferencia: {difference > 0 ? `+${difference}` : difference}{" "}
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
);
