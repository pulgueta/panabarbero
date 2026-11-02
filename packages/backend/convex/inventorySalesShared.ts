/** Payment rails common in Colombian retail. */
export const inventorySalePaymentMethods = [
  "cash",
  "card",
  "nequi",
  "daviplata",
  "transfer",
  "other",
] as const;

export const salePaymentMethodLabels: Record<
  (typeof inventorySalePaymentMethods)[number],
  string
> = {
  cash: "Efectivo",
  card: "Tarjeta débito o crédito",
  nequi: "Nequi",
  daviplata: "Daviplata",
  transfer: "Transferencia bancaria",
  other: "Otro método",
};
