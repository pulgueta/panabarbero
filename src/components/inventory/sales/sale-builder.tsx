import type { Barbershop } from "@convex/schema";
import { PackageIcon } from "@phosphor-icons/react";
import { useSelector } from "@tanstack/react-store";
import type { FC } from "react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { FormStepper } from "@/components/form/form-stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { SellableInventoryItem } from "@/hooks/use-inventory-sales";
import {
  useInventorySaleActions,
  useSellableItems,
} from "@/hooks/use-inventory-sales";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { isSaleProofContentType } from "@/lib/inventory-sale-proof";
import { ProofAttachment } from "./proof-attachment";
import { SaleCustomerFields } from "./sale-customer-fields";
import { buildSaleDetailsPayload } from "./sale-details";
import { SalePaymentFields } from "./sale-payment-fields";
import { SalePreviewPanel } from "./sale-preview-panel";
import { SaleProductsStep } from "./sale-products-step";
import type { ResolvedSaleLine, SaleDraftLine } from "./types";
import { saleFormSteps, useSaleForm } from "./use-sale-form";

interface SaleBuilderProps {
  barbershopId: Barbershop["_id"];
  onRegistered?: () => void;
}

export const SaleBuilder: FC<SaleBuilderProps> = ({
  barbershopId,
  onRegistered,
}) => {
  const [search, setSearch] = useState("");
  const [proofFile, setProofFile] = useState<File>();
  const [confirmStep, setConfirmStep] = useState(false);
  const confirmSaleInFlightRef = useRef(false);

  const haptic = useWebHaptics();

  const { data: items } = useSellableItems(barbershopId);

  const {
    registerSaleMutation: {
      mutateAsync: registerSale,
      isPending: isRegistering,
    },
    uploadProofMutation: { mutateAsync: uploadProof, isPending: isUploading },
    deleteProof,
  } = useInventorySaleActions();

  // The last step's "Registrar venta" submits the validated form, which only
  // opens the confirmation dialog — the mutation runs on explicit confirm.
  const { form, stepper } = useSaleForm(() => {
    setConfirmStep(true);
    haptic.trigger("selection");
  });

  const paymentMethod = useSelector(
    form.store,
    (state) => state.values.paymentMethod,
  );
  const customerName = useSelector(
    form.store,
    (state) => state.values.customerName,
  );
  const issueReceipt = useSelector(
    form.store,
    (state) => state.values.issueReceipt,
  );
  const customerEmail = useSelector(
    form.store,
    (state) => state.values.customerEmail,
  );

  const itemById = useMemo(
    () => new Map(items.map((item) => [item._id, item])),
    [items],
  );

  const filteredItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    if (!term) return items;

    return items.filter((item) =>
      [item.name, item.brand, item.sku, item.model, item.customLabel]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase("es").includes(term)),
    );
  }, [items, search]);

  const resolveLines = (lines: SaleDraftLine[]): ResolvedSaleLine[] =>
    lines.flatMap((line) => {
      const item = itemById.get(line.itemId);
      return item
        ? [{ ...line, item, lineTotal: line.quantity * item.salePrice }]
        : [];
    });

  const addItem = (item: SellableInventoryItem, lines: SaleDraftLine[]) => {
    if (lines.some((line) => line.itemId === item._id)) {
      toast.info("El producto ya está en la venta");
      return;
    }
    if (!item.allowNegativeStock && item.available <= 0) {
      toast.error("Este producto no tiene stock disponible");
      return;
    }

    form.setFieldValue("lines", [...lines, { itemId: item._id, quantity: 1 }]);
    setSearch("");
    haptic.trigger("selection");
  };

  const updateQuantity = (
    item: SellableInventoryItem,
    lines: SaleDraftLine[],
    quantity: number,
  ) => {
    const maximum = item.allowNegativeStock ? 100_000 : item.available;
    const nextQuantity = Math.min(Math.max(1, quantity), Math.max(1, maximum));
    form.setFieldValue(
      "lines",
      lines.map((line) =>
        line.itemId === item._id ? { ...line, quantity: nextQuantity } : line,
      ),
    );
  };

  const removeItem = (
    itemId: SellableInventoryItem["_id"],
    lines: SaleDraftLine[],
  ) => {
    form.setFieldValue(
      "lines",
      lines.filter((line) => line.itemId !== itemId),
    );
    haptic.trigger("selection");
  };

  const confirmSale = async (lines: ResolvedSaleLine[]) => {
    if (confirmSaleInFlightRef.current) return;
    confirmSaleInFlightRef.current = true;

    let proofKey: string | undefined;

    try {
      const proof = proofFile;
      const contentType =
        proof && isSaleProofContentType(proof.type) ? proof.type : undefined;

      if (proof && !contentType) {
        haptic.trigger("error");
        toast.error("Solo se permiten imágenes o archivos PDF");
        return;
      }

      try {
        if (proof) {
          proofKey = await uploadProof({ barbershopId, file: proof });
        }

        await registerSale({
          barbershop: { id: barbershopId },
          lines: lines.map((line) => ({
            item: { id: line.itemId },
            quantity: line.quantity,
          })),
          ...buildSaleDetailsPayload(form.state.values),
          proof:
            proof && proofKey && contentType
              ? {
                  key: proofKey,
                  fileName: proof.name,
                  contentType,
                  size: proof.size,
                }
              : undefined,
        });
      } catch (error) {
        if (proofKey) {
          void deleteProof({
            barbershop: { id: barbershopId },
            key: proofKey,
          }).catch(() => undefined);
        }
        haptic.trigger("error");
        toast.error(getConvexErrorMessage(error));
        return;
      }

      form.reset();
      setProofFile(undefined);
      setConfirmStep(false);
      stepper.goToStep(1);
      haptic.trigger("success");
      toast.success("Venta registrada exitosamente");
      onRegistered?.();
    } finally {
      confirmSaleInFlightRef.current = false;
    }
  };

  const isConfirming = isUploading || isRegistering;

  const handleNextOrSubmit = (draftLines: SaleDraftLine[]) => {
    // The step schema also enforces this; the toast gives visible feedback
    // because the lines list has no field-level error slot.
    if (stepper.currentStep === 1 && draftLines.length === 0) {
      haptic.trigger("error");
      toast.error("Agrega al menos un producto");
      return;
    }

    void stepper.handleNextStepOrSubmit(form);
  };

  if (items.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageIcon />
          </EmptyMedia>
          <EmptyTitle>No hay productos disponibles para la venta.</EmptyTitle>
          <EmptyDescription>
            Un responsable de inventario debe marcar un producto como disponible
            para la venta y asignarle un precio.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <form.Subscribe selector={(state) => state.values.lines}>
      {(draftLines) => {
        const lines = resolveLines(draftLines);
        const hasUnresolvedLines = lines.length !== draftLines.length;
        const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
        const selectedIds = new Set(draftLines.map((line) => line.itemId));

        return (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)] lg:items-start">
            <Card>
              <CardHeader>
                <CardTitle>Nueva venta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormStepper
                  steps={saleFormSteps}
                  currentStep={stepper.currentStep}
                  onSelectStep={stepper.goToStep}
                  canSelectStep={stepper.canGoToStep}
                />

                {stepper.currentStep === 1 && (
                  <SaleProductsStep
                    filteredItems={filteredItems}
                    items={items}
                    lines={lines}
                    search={search}
                    selectedIds={selectedIds}
                    onAddItem={(item) => addItem(item, draftLines)}
                    onRemoveItem={(itemId) => removeItem(itemId, draftLines)}
                    onSearchChange={setSearch}
                    onUpdateQuantity={(item, quantity) =>
                      updateQuantity(item, draftLines, quantity)
                    }
                  />
                )}

                {stepper.currentStep === 2 && (
                  <>
                    <SalePaymentFields form={form} />
                    <ProofAttachment
                      file={proofFile}
                      onFileChange={setProofFile}
                      isUploading={isUploading}
                      disabled={isConfirming}
                    />
                  </>
                )}

                {stepper.currentStep === 3 && (
                  <SaleCustomerFields form={form} />
                )}

                <div className="flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={stepper.isFirstStep || isConfirming}
                    onClick={stepper.goToPrevStep}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    disabled={isConfirming}
                    onClick={() => handleNextOrSubmit(draftLines)}
                  >
                    {stepper.isLastStep ? "Registrar venta" : "Siguiente"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="lg:sticky lg:top-20">
              <SalePreviewPanel
                lines={lines}
                proof={proofFile}
                total={total}
                paymentMethod={paymentMethod}
                customerName={customerName.trim() || undefined}
                issueReceipt={issueReceipt}
                receiptEmail={
                  issueReceipt ? customerEmail.trim() || undefined : undefined
                }
                confirmStep={confirmStep}
                isConfirming={isConfirming}
                onCancelConfirm={() => setConfirmStep(false)}
                onConfirm={() => {
                  if (hasUnresolvedLines) {
                    form.setFieldValue(
                      "lines",
                      draftLines.filter((line) => itemById.has(line.itemId)),
                    );
                    setConfirmStep(false);
                    haptic.trigger("error");
                    toast.error(
                      "Uno de los productos ya no está disponible. Revisa la venta.",
                    );
                    return;
                  }

                  void confirmSale(lines);
                }}
              />
            </div>
          </div>
        );
      }}
    </form.Subscribe>
  );
};
