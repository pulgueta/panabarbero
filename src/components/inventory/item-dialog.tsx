import type { Barbershop, InventoryItem } from "@convex/schema";
import type { FC, ReactElement } from "react";
import { useState } from "react";

import type { ItemFormData } from "@/components/inventory/item-form";
import { ItemForm } from "@/components/inventory/item-form";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";

interface ItemDialogProps {
  barbershopId: Barbershop["_id"];
  initialValues?: ItemFormData;
  itemId?: InventoryItem["_id"];
  currentImageKey?: string;
  trigger: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ItemDialog: FC<ItemDialogProps> = ({
  barbershopId,
  initialValues,
  itemId,
  currentImageKey,
  trigger,
  open,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const headLabel = `${initialValues ? "Editar" : "Agregar"} producto`;
  const description = `${initialValues ? "Actualiza los datos del producto." : "Define los datos básicos del producto."}`;

  return (
    <ResponsiveModal
      open={open ?? internalOpen}
      onOpenChange={handleOpenChange}
    >
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{headLabel}</ResponsiveModalTitle>
          <ResponsiveModalDescription>{description}</ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalFooter>
          <ItemForm
            initialValues={initialValues}
            barbershopId={barbershopId}
            itemId={itemId}
            currentImageKey={currentImageKey}
            onSuccess={() => handleOpenChange(false)}
          />
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
