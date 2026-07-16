import { inventorySalePaymentMethods } from "@convex/schema";
import type { FC } from "react";

import { salePaymentMethodLabels } from "./labels";
import type { SaleForm } from "./use-sale-form";

const paymentMethodOptions = inventorySalePaymentMethods.map((value) => ({
  value,
  label: salePaymentMethodLabels[value],
}));

/** Step 2 — how the sale was paid, plus internal notes. */
export const SalePaymentFields: FC<{ form: SaleForm }> = ({ form }) => (
  <>
    <div className="grid gap-4 sm:grid-cols-2">
      <form.AppField name="paymentMethod">
        {(field) => (
          <field.SelectField
            label="Método de pago"
            options={paymentMethodOptions}
            className="w-full"
          />
        )}
      </form.AppField>

      <form.Subscribe selector={(state) => state.values.paymentMethod}>
        {(paymentMethod) =>
          paymentMethod !== "cash" ? (
            <form.AppField name="paymentReference">
              {(field) => (
                <field.TextField
                  label="Referencia de pago"
                  description="Opcional — número de aprobación o comprobante"
                  placeholder="M1234567"
                  maxLength={60}
                />
              )}
            </form.AppField>
          ) : null
        }
      </form.Subscribe>
    </div>

    <form.AppField name="notes">
      {(field) => (
        <field.TextAreaField
          label="Notas"
          description="Opcional — detalles adicionales de la venta"
          placeholder="Venta a domicilio, encargo, etc."
          maxLength={300}
        />
      )}
    </form.AppField>
  </>
);
