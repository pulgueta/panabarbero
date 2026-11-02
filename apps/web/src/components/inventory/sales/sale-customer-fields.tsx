import { inventorySaleDocumentTypes } from "@convex/schema";
import type { FC } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { PhoneInput } from "@/components/ui/phone-input";
import { saleDocumentTypeLabels } from "./labels";
import type { SaleForm } from "./use-sale-form";

interface SaleCustomerFieldsProps {
  form: SaleForm;
}

const documentTypeOptions = inventorySaleDocumentTypes.map((value) => ({
  value,
  label: saleDocumentTypeLabels[value],
}));

/**
 * Step 3 — the customer identity, always required for the sale's receipt.
 * Only the email is optional; when present, the receipt is emailed.
 */
export const SaleCustomerFields: FC<SaleCustomerFieldsProps> = ({ form }) => (
  <>
    <p className="text-muted-foreground text-xs">
      Registraremos estos datos en el recibo de la venta. Si agregas un correo,
      le enviaremos el recibo automáticamente.
    </p>

    <div className="grid gap-4 sm:grid-cols-2">
      <form.AppField name="customerName">
        {(field) => (
          <field.TextField
            label="Nombre o razón social"
            placeholder="Juan Pérez"
            maxLength={120}
          />
        )}
      </form.AppField>

      <form.AppField name="customerPhone">
        {(field) => {
          const isInvalid =
            field.state.meta.isTouched && field.state.meta.errors.length > 0;

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel htmlFor={field.name}>Celular</FieldLabel>
              <PhoneInput
                id={field.name}
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                defaultCountry="CO"
                placeholder="311 987 1234"
                aria-invalid={isInvalid}
              />
              {isInvalid && <FieldError errors={field.state.meta.errors} />}
            </Field>
          );
        }}
      </form.AppField>

      <form.AppField name="customerDocumentType">
        {(field) => (
          <field.SelectField
            label="Tipo de documento"
            placeholder="Selecciona un tipo"
            options={documentTypeOptions}
            className="w-full"
          />
        )}
      </form.AppField>

      <form.AppField name="customerDocumentNumber">
        {(field) => (
          <field.TextField
            label="Número de documento"
            placeholder="1234567890"
            maxLength={20}
          />
        )}
      </form.AppField>

      <div className="sm:col-span-2">
        <form.AppField name="customerEmail">
          {(field) => (
            <field.TextField
              label="Correo electrónico"
              description="Opcional — si lo agregas, le enviaremos el recibo automáticamente"
              type="email"
              placeholder="cliente@correo.com"
              maxLength={255}
            />
          )}
        </form.AppField>
      </div>
    </div>
  </>
);
