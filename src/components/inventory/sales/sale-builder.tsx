import type { Barbershop } from "@convex/schema";
import {
  MinusIcon,
  PackageIcon,
  PlusIcon,
  ShoppingCartIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useStore } from "@tanstack/react-form";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { FormStepper } from "@/components/form/form-stepper";
import { formatInventoryStockSuffix } from "@/components/inventory/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SellableInventoryItem } from "@/hooks/use-inventory-sales";
import {
  useInventorySaleActions,
  useSellableItems,
} from "@/hooks/use-inventory-sales";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { isSaleProofContentType } from "@/lib/inventory-sale-proof";
import { cn, formatCurrency } from "@/lib/utils";
import { ProofAttachment } from "./proof-attachment";
import { SaleCustomerFields } from "./sale-customer-fields";
import { buildSaleDetailsPayload } from "./sale-details";
import { SalePaymentFields } from "./sale-payment-fields";
import { SalePreviewPanel } from "./sale-preview-panel";
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

  const paymentMethod = useStore(
    form.store,
    (state) => state.values.paymentMethod,
  );
  const customerName = useStore(
    form.store,
    (state) => state.values.customerName,
  );
  const issueReceipt = useStore(
    form.store,
    (state) => state.values.issueReceipt,
  );
  const customerEmail = useStore(
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
    const proof = proofFile;
    const contentType =
      proof && isSaleProofContentType(proof.type) ? proof.type : undefined;

    if (proof && !contentType) {
      haptic.trigger("error");
      toast.error("Solo se permiten imágenes o archivos PDF");
      return;
    }

    let proofKey: string | undefined;

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

      form.reset();
      setProofFile(undefined);
      setConfirmStep(false);
      stepper.goToStep(1);
      haptic.trigger("success");
      toast.success("Venta registrada exitosamente");
      onRegistered?.();
    } catch (error) {
      if (proofKey) {
        void deleteProof({
          barbershop: { id: barbershopId },
          key: proofKey,
        }).catch(() => undefined);
      }
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
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
                  <>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="sale-product-search">Producto</Label>
                      {/* filter={null}: the list is already filtered by `search`;
                          Base UI would otherwise match the query against item IDs
                          and flag the popup empty while results are visible. */}
                      <Combobox
                        items={filteredItems.map((item) => item._id)}
                        filter={null}
                        onValueChange={(itemId: string | null) => {
                          const item = itemId
                            ? items.find(
                                (candidate) => candidate._id === itemId,
                              )
                            : undefined;
                          if (item) addItem(item, draftLines);
                        }}
                      >
                        <ComboboxInput
                          id="sale-product-search"
                          placeholder="Busca por nombre, marca, SKU o modelo"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          showClear
                          className="w-full"
                        />
                        <ComboboxContent>
                          <ComboboxEmpty>
                            No se encontraron productos.
                          </ComboboxEmpty>
                          <ComboboxList>
                            {filteredItems.map((item) => {
                              const unavailable =
                                !item.allowNegativeStock && item.available <= 0;
                              const lowStock =
                                item.belowReorder && !unavailable;
                              return (
                                <ComboboxItem
                                  key={item._id}
                                  value={item._id}
                                  disabled={
                                    unavailable || selectedIds.has(item._id)
                                  }
                                  className={cn(
                                    lowStock &&
                                      "bg-warning/10 data-highlighted:bg-warning/20 dark:bg-warning/20 dark:data-highlighted:bg-warning/30",
                                  )}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={cn(
                                        "truncate font-medium",
                                        lowStock && "text-warning",
                                      )}
                                    >
                                      {item.name}
                                    </p>
                                    <p className="truncate text-muted-foreground text-xs">
                                      {[item.brand, item.sku]
                                        .filter(Boolean)
                                        .join(" | ") ||
                                        "Producto de inventario"}
                                    </p>
                                  </div>
                                  <div className="text-right text-xs tabular-nums">
                                    <p>{formatCurrency(item.salePrice)}</p>
                                    <p
                                      className={cn(
                                        "text-muted-foreground",
                                        lowStock && "text-warning",
                                      )}
                                    >
                                      {item.available}{" "}
                                      {formatInventoryStockSuffix(
                                        item.available,
                                        item.unit,
                                      )}
                                    </p>
                                  </div>
                                </ComboboxItem>
                              );
                            })}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                      <p className="text-muted-foreground text-xs">
                        Solo aparecen productos marcados como disponibles para
                        la venta.
                      </p>
                    </div>

                    {lines.length === 0 ? (
                      <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center">
                        <ShoppingCartIcon className="mb-2 size-6 text-muted-foreground" />
                        <p className="font-medium text-sm">
                          La venta está vacía
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Busca un producto para agregarlo.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y rounded-xl border">
                        {lines.map(({ item, quantity, lineTotal }) => (
                          <div
                            key={item._id}
                            className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(6rem,auto)_auto] sm:gap-4"
                          >
                            <div className="col-start-1 row-start-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-medium text-sm">
                                  {item.name}
                                </p>
                                {item.belowReorder ? (
                                  <Badge variant="warning" className="shrink-0">
                                    Bajo stock
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="text-muted-foreground text-xs tabular-nums">
                                {formatCurrency(item.salePrice)} por{" "}
                                {formatInventoryStockSuffix(1, item.unit)}
                              </p>
                            </div>

                            <div className="col-start-1 row-start-2 flex items-center gap-1 sm:col-start-2 sm:row-start-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                aria-label={`Quitar una unidad de ${item.name}`}
                                disabled={quantity <= 1}
                                onClick={() =>
                                  updateQuantity(item, draftLines, quantity - 1)
                                }
                              >
                                <MinusIcon />
                              </Button>
                              <Input
                                aria-label={`Cantidad de ${item.name}`}
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={
                                  item.allowNegativeStock
                                    ? 100_000
                                    : item.available
                                }
                                value={quantity}
                                onChange={(event) =>
                                  updateQuantity(
                                    item,
                                    draftLines,
                                    Number(event.target.value),
                                  )
                                }
                                className="w-20 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                aria-label={`Agregar una unidad de ${item.name}`}
                                disabled={
                                  !item.allowNegativeStock &&
                                  quantity >= item.available
                                }
                                onClick={() =>
                                  updateQuantity(item, draftLines, quantity + 1)
                                }
                              >
                                <PlusIcon />
                              </Button>
                            </div>

                            <span className="col-start-2 row-start-2 justify-self-end font-medium text-sm tabular-nums sm:col-start-3 sm:row-start-1">
                              {formatCurrency(lineTotal)}
                            </span>

                            <Button
                              type="button"
                              variant="destructive"
                              size="icon-sm"
                              aria-label={`Quitar ${item.name}`}
                              className="col-start-2 row-start-1 justify-self-end sm:col-start-4 sm:row-start-1"
                              onClick={() => removeItem(item._id, draftLines)}
                            >
                              <TrashIcon />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
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
                onConfirm={() => void confirmSale(lines)}
              />
            </div>
          </div>
        );
      }}
    </form.Subscribe>
  );
};
