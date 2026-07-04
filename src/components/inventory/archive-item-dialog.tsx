import type { Barbershop, InventoryItem } from "@convex/schema";
import type { FC, ReactElement } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import { Spinner } from "@/components/ui/spinner";
import { useInventoryActions } from "@/hooks/use-inventory";
import { getConvexErrorMessage } from "@/lib/convex-errors";

interface ArchiveItemDialogProps {
  trigger: ReactElement;
  itemId: InventoryItem["_id"];
  barbershopId: Barbershop["_id"];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Parses the "WILL_RELEASE:N" error message from the backend.
 * Returns the impacted reservation/recipe count if matched, otherwise null.
 */
function parseWillReleaseError(errorMessage: string): number | null {
  const match = errorMessage.match(/WILL_RELEASE:(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

export const ArchiveItemDialog: FC<ArchiveItemDialogProps> = ({
  trigger,
  itemId,
  barbershopId,
  open,
  onOpenChange,
}) => {
  const haptic = useWebHaptics();

  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const [confirmationStep, setConfirmationStep] = useState<
    "initial" | "confirm_release"
  >("initial");
  const [impactedCount, setImpactedCount] = useState<number>(0);

  const {
    archiveItemMutation: { mutateAsync: archiveItem, isPending: isArchiving },
  } = useInventoryActions();

  // Reset state when dialog opens/closes
  const handleOpenChange = (nextOpen: boolean) => {
    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      setConfirmationStep("initial");
      setImpactedCount(0);
    }
  };

  const onArchive = async (force = false) => {
    try {
      await archiveItem({
        item: { id: itemId },
        barbershop: { id: barbershopId },
        force,
      });

      haptic.trigger("success");
      toast.success("Producto archivado exitosamente");
      handleOpenChange(false);
    } catch (error) {
      const errorMessage = getConvexErrorMessage(error);
      const willReleaseCount = parseWillReleaseError(errorMessage);

      if (willReleaseCount !== null && !force) {
        setImpactedCount(willReleaseCount);
        setConfirmationStep("confirm_release");
      } else {
        haptic.trigger("error");
        toast.error(errorMessage);
      }
    }
  };

  const isInitialStep = confirmationStep === "initial";

  const dialogTitle = isInitialStep
    ? "Archivar producto"
    : "Confirmar archivado";

  const dialogDescription = isInitialStep
    ? "¿Estás seguro que deseas archivar este producto? Dejará de aparecer en el inventario, pero su historial se conservará."
    : `Este producto tiene ${impactedCount} reserva(s) o receta(s) asociada(s) que serán liberadas y desvinculadas.`;

  const buttonLabel = isInitialStep
    ? "Sí, archivar"
    : `Archivar y liberar ${impactedCount} referencia(s)`;

  return (
    <ResponsiveModal
      open={open ?? internalOpen}
      onOpenChange={handleOpenChange}
    >
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{dialogTitle}</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {dialogDescription}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalFooter className="gap-2">
          {!isInitialStep && (
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isArchiving}
            >
              Cancelar
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => onArchive(!isInitialStep)}
            disabled={isArchiving}
          >
            {isArchiving && <Spinner />}
            {buttonLabel}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
