import type {
  InventorySaleDocumentType,
  InventorySalePaymentMethod,
} from "@convex/schema";

import type { SellableInventoryItem } from "@/hooks/use-inventory-sales";

export interface SaleDraftLine {
  itemId: SellableInventoryItem["_id"];
  quantity: number;
}

export interface ResolvedSaleLine extends SaleDraftLine {
  item: SellableInventoryItem;
  lineTotal: number;
}

export interface SaleFormValues {
  lines: SaleDraftLine[];
  paymentMethod: InventorySalePaymentMethod;
  paymentReference: string;
  customerName: string;
  customerDocumentType: InventorySaleDocumentType | "";
  customerDocumentNumber: string;
  /** E.164 (`+57…`) — the PhoneInput emits normalized values. */
  customerPhone: string;
  customerEmail: string;
  notes: string;
}

export const saleFormDefaults: SaleFormValues = {
  lines: [],
  paymentMethod: "cash",
  paymentReference: "",
  customerName: "",
  customerDocumentType: "",
  customerDocumentNumber: "",
  customerPhone: "",
  customerEmail: "",
  notes: "",
};
