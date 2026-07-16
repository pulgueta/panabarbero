import type { InventorySalePaymentMethod } from "@convex/schema";
import { FilePdfIcon, ReceiptIcon } from "@phosphor-icons/react";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/lib/utils";
import { formatInventoryStockSuffix } from "../labels";
import { salePaymentMethodLabels } from "./labels";
import type { ResolvedSaleLine } from "./types";

interface SalePreviewPanelProps {
  lines: ResolvedSaleLine[];
  proof?: File;
  total: number;
  paymentMethod: InventorySalePaymentMethod;
  customerName?: string;
  issueReceipt: boolean;
  /** Set when the receipt will also be emailed to the customer. */
  receiptEmail?: string;
  /** Two-step confirm: a responsive dialog asks for explicit confirmation first. */
  confirmStep: boolean;
  isConfirming: boolean;
  onCancelConfirm: () => void;
  onConfirm: () => void;
}

/**
 * Live summary of the sale being built. Confirmation happens in a responsive
 * dialog (Dialog on desktop, bottom Drawer on mobile) on top of the preview.
 */
export const SalePreviewPanel: FC<SalePreviewPanelProps> = ({
  lines,
  proof,
  total,
  paymentMethod,
  customerName,
  issueReceipt,
  receiptEmail,
  confirmStep,
  isConfirming,
  onCancelConfirm,
  onConfirm,
}) => (
  <>
    <Card>
      <CardHeader>
        <CardTitle>Resumen de la venta</CardTitle>
        <CardDescription>
          Revisa los productos, las cantidades y el total antes de descontar el
          inventario.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lines.length === 0 ? (
          <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center">
            <ReceiptIcon className="mb-2 size-6 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              Agrega productos para ver el resumen.
            </p>
          </div>
        ) : (
          <div className="divide-y rounded-xl border">
            {lines.map(({ item, quantity, lineTotal }) => {
              const remaining = item.available - quantity;
              return (
                <div
                  key={item._id}
                  className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{item.name}</p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {quantity}{" "}
                      {formatInventoryStockSuffix(quantity, item.unit)}
                      {" a "}
                      {formatCurrency(item.salePrice)}
                    </p>
                  </div>
                  <p className="font-medium text-sm tabular-nums">
                    {formatCurrency(lineTotal)}
                  </p>
                  {!item.allowNegativeStock ? (
                    <p className="col-span-2 text-muted-foreground text-xs tabular-nums">
                      Quedarán {remaining}{" "}
                      {formatInventoryStockSuffix(remaining, item.unit)}{" "}
                      disponibles
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-2 rounded-xl border p-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Método de pago</span>
            <span className="font-medium">
              {salePaymentMethodLabels[paymentMethod]}
            </span>
          </div>
          {customerName ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Cliente</span>
              <span className="truncate font-medium">{customerName}</span>
            </div>
          ) : null}
          {issueReceipt ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Recibo</span>
              <span className="truncate font-medium">
                {receiptEmail
                  ? `Se enviará a ${receiptEmail}`
                  : "Sin envío por correo"}
              </span>
            </div>
          ) : null}
        </div>

        {proof ? (
          <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
            {proof.type === "application/pdf" ? (
              <FilePdfIcon className="size-5 shrink-0 text-muted-foreground" />
            ) : (
              <ReceiptIcon className="size-5 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <p className="truncate font-medium text-sm">{proof.name}</p>
              <p className="text-muted-foreground text-xs">
                Se guardará como comprobante de esta venta.
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex items-baseline justify-between gap-4 rounded-xl bg-primary/5 p-4">
          <span className="font-medium">Total</span>
          <span className="font-semibold text-xl tabular-nums">
            {formatCurrency(total)}
          </span>
        </div>
      </CardContent>
    </Card>

    <ResponsiveModal
      open={confirmStep}
      onOpenChange={(open) => {
        if (!open) onCancelConfirm();
      }}
    >
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Confirmar venta</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Se descontará el stock de {lines.length}{" "}
            {lines.length === 1 ? "producto" : "productos"}. Esta acción no se
            puede deshacer.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <ResponsiveModalFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isConfirming}
            onClick={onCancelConfirm}
          >
            Seguir editando
          </Button>
          <Button type="button" disabled={isConfirming} onClick={onConfirm}>
            {isConfirming ? <Spinner /> : null}
            {isConfirming ? "Registrando" : "Confirmar venta"}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  </>
);
