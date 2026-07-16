import { inventorySaleDocumentTypes } from "@convex/schema";
import type { FC } from "react";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
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
 * Step 3 — receipt toggle + customer identity. With the receipt on, the
 * name, document and phone become required; without it everything stays
 * optional follow-up data.
 */
export const SaleCustomerFields: FC<SaleCustomerFieldsProps> = ({ form }) => (
  <>
    <div className="flex flex-col gap-2">
      <form.AppField name="issueReceipt">
        {(field) => <field.SwitchField label="Emitir recibo al cliente" />}
      </form.AppField>
      <p className="text-muted-foreground text-xs">
        Enviaremos el detalle de la compra al cliente. Requiere su nombre,
        documento y celular.
      </p>
    </div>

    <form.Subscribe selector={(state) => state.values.issueReceipt}>
      {(issueReceipt) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <form.AppField name="customerName">
            {(field) => (
              <field.TextField
                label="Nombre o razón social"
                description={issueReceipt ? "Requerido" : "Opcional"}
                placeholder="Juan Pérez"
                maxLength={120}
              />
            )}
          </form.AppField>

          <form.AppField name="customerPhone">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched &&
                field.state.meta.errors.length > 0;

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
                  <FieldDescription>
                    {issueReceipt
                      ? "Requerido"
                      : "Opcional — para contactar al cliente"}
                  </FieldDescription>
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
                description={issueReceipt ? "Requerido" : "Opcional"}
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
                  description={
                    issueReceipt
                      ? "Opcional — si lo agregas, le enviaremos el recibo por correo"
                      : "Opcional — para contactar al cliente"
                  }
                  type="email"
                  placeholder="cliente@correo.com"
                  maxLength={255}
                />
              )}
            </form.AppField>
          </div>
        </div>
      )}
    </form.Subscribe>
  </>
);
