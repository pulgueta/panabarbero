import type { Barbershop, InventoryItem, Service } from "@convex/schema";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import type { FC, ReactElement } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopPlan } from "@/hooks/billing/use-plan";
import {
  inventoryOverviewQueryOptions,
  useInventoryActions,
  useServiceRecipe,
} from "@/hooks/use-inventory";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import {
  invalidQuantityMessage,
  parsePositiveIntegerQuantity,
} from "@/lib/inventory-form";

const MAX_RECIPE_LINES = 20;

type RecipeLine = {
  itemId: InventoryItem["_id"];
  quantity: number;
};

interface ServiceRecipeEditorProps {
  serviceId: Service["_id"];
  barbershopId: Barbershop["_id"];
  onSuccess: () => void;
}

export const ServiceRecipeEditor: FC<ServiceRecipeEditorProps> = ({
  serviceId,
  barbershopId,
  onSuccess,
}) => {
  const haptic = useWebHaptics();

  const [lines, setLines] = useState<RecipeLine[] | null>(null);

  const { data: recipe } = useServiceRecipe(serviceId);
  const { data: overview } = useQuery(
    inventoryOverviewQueryOptions(barbershopId),
  );

  const {
    setServiceRecipeMutation: { mutateAsync: setServiceRecipe, isPending },
  } = useInventoryActions();

  if (!recipe || !overview) {
    return <Skeleton className="h-32 w-full" />;
  }

  // Pristine until edited: archived lines are dropped (archiving already
  // detaches recipes server-side; the flag is defensive).
  const currentLines =
    lines ??
    recipe.reduce<Array<{ itemId: InventoryItem["_id"]; quantity: number }>>(
      (acc, line) => {
        if (!line.isArchived) {
          acc.push({ itemId: line.itemId, quantity: line.quantity });
        }
        return acc;
      },
      [],
    );

  const usedIds = new Set(currentLines.map((line) => line.itemId));
  const availableItems = overview.rows.filter((row) => !usedIds.has(row._id));

  const updateLine = (index: number, patch: Partial<RecipeLine>) => {
    setLines(
      currentLines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    );
  };

  const removeLine = (index: number) => {
    setLines(currentLines.filter((_, lineIndex) => lineIndex !== index));
  };

  const onSave = async () => {
    const validatedLines: RecipeLine[] = [];

    for (const line of currentLines) {
      const quantity = parsePositiveIntegerQuantity(line.quantity);

      if (!quantity) {
        haptic.trigger("error");
        toast.error(invalidQuantityMessage);
        return;
      }

      validatedLines.push({ itemId: line.itemId, quantity });
    }

    try {
      await setServiceRecipe({
        service: { id: serviceId },
        lines: validatedLines.map((line) => ({
          item: { id: line.itemId },
          quantity: line.quantity,
        })),
      });

      haptic.trigger("success");
      toast.success("Insumos actualizados exitosamente");
      onSuccess();
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
  };

  return (
    <div className="w-full space-y-4">
      {overview.rows.length === 0 ? (
        <p className="py-4 text-center text-muted-foreground text-sm">
          Primero crea productos en tu inventario para poder asociarlos.
        </p>
      ) : (
        <div className="space-y-2">
          {currentLines.length === 0 && (
            <p className="py-4 text-center text-muted-foreground text-sm">
              Este servicio aún no consume productos del inventario.
            </p>
          )}

          {currentLines.map((line, index) => {
            const lineItem = overview.rows.find(
              (row) => row._id === line.itemId,
            );

            return (
              <div key={line.itemId} className="flex items-center gap-2">
                <Select
                  value={line.itemId}
                  onValueChange={(value) =>
                    updateLine(index, {
                      itemId: value as InventoryItem["_id"],
                    })
                  }
                >
                  <SelectTrigger className="flex-1" aria-label="Producto">
                    <SelectValue placeholder="Selecciona un producto">
                      {lineItem?.name ?? "Selecciona un producto"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[...(lineItem ? [lineItem] : []), ...availableItems].map(
                      (row) => (
                        <SelectItem key={row._id} value={row._id}>
                          {row.name}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>

                <Input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(index, { quantity: Number(e.target.value) })
                  }
                  className="w-24 tabular-nums"
                  aria-label="Cantidad"
                />

                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeLine(index)}
                  aria-label="Quitar insumo"
                >
                  <TrashIcon />
                </Button>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={
              availableItems.length === 0 ||
              currentLines.length >= MAX_RECIPE_LINES
            }
            onClick={() =>
              setLines([
                ...currentLines,
                { itemId: availableItems[0]._id, quantity: 1 },
              ])
            }
          >
            <PlusIcon />
            Agregar insumo
          </Button>
        </div>
      )}

      <Button className="w-full" onClick={onSave} disabled={isPending}>
        {isPending && <Spinner />}
        Guardar
      </Button>
    </div>
  );
};

interface ServiceRecipeDialogProps {
  serviceId: Service["_id"];
  barbershopId: Barbershop["_id"];
  /** Omit when driving the modal externally via `open` / `onOpenChange`. */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ServiceRecipeDialog: FC<ServiceRecipeDialogProps> = ({
  serviceId,
  barbershopId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const { planLimits } = useBarbershopPlan(barbershopId);

  // Inventory queries throw for plans without the feature — hide the entry
  // point entirely instead of mounting subscriptions that will error.
  if (!planLimits.inventoryEnabled) {
    return null;
  }

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      {trigger ? <ResponsiveModalTrigger render={trigger} /> : null}
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Insumos del servicio</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Define los productos que se reservan y consumen con cada cita de
            este servicio.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalFooter>
          <ServiceRecipeEditor
            serviceId={serviceId}
            barbershopId={barbershopId}
            onSuccess={() => setOpen(false)}
          />
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
