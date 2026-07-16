import type { SaleFormValues } from "./types";

/**
 * Maps the form values to the `registerSale` args, dropping empty fields.
 * Validation already ran through the step schemas by the time this is called.
 */
export function buildSaleDetailsPayload(values: SaleFormValues) {
  const customerName = values.customerName.trim();

  return {
    paymentMethod: values.paymentMethod,
    paymentReference:
      values.paymentMethod === "cash"
        ? undefined
        : values.paymentReference.trim() || undefined,
    issueReceipt: values.issueReceipt || undefined,
    customer: customerName
      ? {
          name: customerName,
          documentType: values.customerDocumentType || undefined,
          documentNumber: values.customerDocumentNumber.trim() || undefined,
          phone: values.customerPhone || undefined,
          email: values.customerEmail.trim().toLowerCase() || undefined,
        }
      : undefined,
    notes: values.notes.trim() || undefined,
  };
}
