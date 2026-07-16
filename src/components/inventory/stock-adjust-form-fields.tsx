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
  state: Omit<StockAdjustDialogState, "form">;
}

export const StockAdjustFormFields: FC<StockAdjustFormFieldsProps> = ({
  item,
  form,
  state,
}) => {
  const showQuantity = state.operation !== "adjust";
  const showCountedField = state.operation === "adjust" && state.countMode;
  const showDeltaField = state.operation === "adjust" && !state.countMode;
  const reasonRequired =
    state.operation === "adjust" || state.operation === "waste";

  return (
    <FieldGroup>
      <div className="space-y-2">
        <Label htmlFor="stock-operation">Operación</Label>
        <Select
          value={state.operation}
          onValueChange={(value) =>
            state.setOperation(value as StockAdjustDialogState["operation"])
          }
        >
          <SelectTrigger id="stock-operation" className="w-full">
            <SelectValue>
              {state.operationOptions.find(
                (option) => option.value === state.operation,
              )?.label ?? "Selecciona una operación"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {state.operationOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {state.operation === "receive" && state.canReceiveByPackage && (
        <div className="flex items-center gap-3">
          <Switch
            id="receive-package-mode"
            checked={state.receivePackageMode}
            onCheckedChange={(checked) => {
              state.haptic.trigger("selection");
              state.setReceivePackageMode(checked);
            }}
          />
          <Label htmlFor="receive-package-mode">Recibir por envases</Label>
        </div>
      )}

      {showQuantity &&
      state.operation === "receive" &&
      state.receivePackageMode ? (
        <>
          <form.AppField name="packageCount">
            {(field) => (
              <field.AddonField
                label="Envases recibidos"
                description={`Cada envase suma ${item.presentationValue} ${state.presentationSuffix} al stock.`}
                type="number"
                min={1}
                addonEnd="envases"
                className="tabular-nums"
              />
            )}
          </form.AppField>

          <form.Subscribe selector={(state) => state.values.packageCount}>
            {(packageCount) => {
              const packages =
                Number(packageCount) > 0 ? Number(packageCount) : 0;
              const total = packages * (item.presentationValue ?? 0);

              return (
                <p className="text-muted-foreground text-sm tabular-nums">
                  Entrada al stock: {total} {state.unitSuffix}
                </p>
              );
            }}
          </form.Subscribe>
        </>
      ) : showQuantity ? (
        <form.AppField name="quantity">
          {(field) => (
            <field.AddonField
              label="Cantidad"
              description={
                item.presentationValue && item.presentationUnit
                  ? `Contenido por unidad: ${item.presentationValue} ${item.presentationUnit}`
                  : undefined
              }
              type="number"
              min={1}
              addonEnd={state.unitSuffix}
              className="tabular-nums"
            />
          )}
        </form.AppField>
      ) : null}

      {state.operation === "receive" && (
        <form.AppField name="unitCost">
          {(field) => (
            <field.AddonField
              label="Costo unitario"
              description="Opcional — actualiza el costo promedio"
              addonStart="COP"
              placeholder="5000"
              type="number"
              min={0}
              className="tabular-nums"
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

      {state.operation === "adjust" && (
        <div className="flex items-center gap-3">
          <Switch
            id="stock-count-mode"
            checked={state.countMode}
            onCheckedChange={(checked) => {
              state.haptic.trigger("selection");
              state.setCountMode(checked);
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
                description={`En ${state.unitSuffix}`}
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
                  {state.unitSuffix}
                </p>
              );
            }}
          </form.Subscribe>
        </>
      )}

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
    </FieldGroup>
  );
};
