import type { FC, ReactElement } from "react";

import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import type { InventoryOverviewRow } from "@/hooks/use-inventory";

import { StockAdjustFormFields } from "./stock-adjust-form-fields";
import { useStockAdjustDialog } from "./use-stock-adjust-dialog";

interface StockAdjustDialogProps {
  item: InventoryOverviewRow;
  /** Managers get every operation; barbers only consume/sale. */
  canManage: boolean;
  trigger: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const StockAdjustDialog: FC<StockAdjustDialogProps> = ({
  item,
  canManage,
  trigger,
  open,
  onOpenChange,
}) => {
  const { form, ...dialogFields } = useStockAdjustDialog({
    item,
    canManage,
    onOpenChange,
  });

  return (
    <ResponsiveModal
      open={open ?? dialogFields.internalOpen}
      onOpenChange={dialogFields.handleOpenChange}
    >
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            {canManage ? "Ajustar stock" : "Registrar uso o venta"}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {`Registra movimientos de "${item.name}". Stock actual: ${item.onHand} ${dialogFields.unitSuffix}.`}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalFooter>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="w-full space-y-4"
          >
            <StockAdjustFormFields
              form={form}
              item={item}
              state={dialogFields}
            />

            <form.AppForm>
              <form.SubmitButton
                label="Registrar"
                className="w-full"
                requireDirty={false}
              />
            </form.AppForm>
          </form>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
