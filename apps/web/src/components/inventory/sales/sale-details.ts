import type { InventorySaleDocumentType } from "@convex/schema";

import type { SaleFormValues } from "./types";

/**
 * Maps the form values to the `registerSale` args, dropping empty fields.
 * Validation already ran through the step schemas by the time this is called.
 */
export function buildSaleDetailsPayload(values: SaleFormValues) {
  return {
    paymentMethod: values.paymentMethod,
    paymentReference:
      values.paymentMethod === "cash"
        ? undefined
        : values.paymentReference.trim() || undefined,
    customer: {
      name: values.customerName.trim(),
      // The step schema rejects an empty selection before submit.
      documentType: values.customerDocumentType as InventorySaleDocumentType,
      documentNumber: values.customerDocumentNumber.trim(),
      phone: values.customerPhone,
      email: values.customerEmail.trim().toLowerCase() || undefined,
    },
    notes: values.notes.trim() || undefined,
  };
}
