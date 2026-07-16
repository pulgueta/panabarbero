import type { InventorySaleDocumentType } from "@convex/schema";

export { salePaymentMethodLabels } from "@convex/inventorySalesShared";

export const saleDocumentTypeLabels: Record<InventorySaleDocumentType, string> =
  {
    cc: "Cédula de ciudadanía",
    ce: "Cédula de extranjería",
    nit: "NIT",
    ti: "Tarjeta de identidad",
    pp: "Pasaporte",
    ppt: "Permiso por protección temporal (PPT)",
  };

export const saleDocumentTypeShortLabels: Record<
  InventorySaleDocumentType,
  string
> = {
  cc: "CC",
  ce: "CE",
  nit: "NIT",
  ti: "TI",
  pp: "PP",
  ppt: "PPT",
};
