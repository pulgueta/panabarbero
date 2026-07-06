import type { Barbershop, Service } from "@convex/schema";
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
import { useServiceActions } from "@/hooks/use-services";
import { getConvexErrorMessage } from "@/lib/convex-errors";

interface DeleteServiceDialogProps {
  /** Omit when driving the modal externally via `open` / `onOpenChange`. */
  trigger?: ReactElement;
  serviceId: Service["_id"];
  barbershopId: Barbershop["_id"];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Parses the "WILL_CANCEL:N" error message from the backend.
 * Returns the appointment count if matched, otherwise null.
 */
function parseWillCancelError(errorMessage: string): number | null {
  const match = errorMessage.match(/WILL_CANCEL:(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

export const DeleteServiceDialog: FC<DeleteServiceDialogProps> = ({
  trigger,
  serviceId,
  barbershopId,
  open: controlledOpen,
  onOpenChange,
}) => {
  const haptic = useWebHaptics();

  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const [confirmationStep, setConfirmationStep] = useState<
    "initial" | "confirm_cancellation"
  >("initial");
  const [impactedCount, setImpactedCount] = useState<number>(0);

  const {
    deleteServiceMutation: {
      mutateAsync: deleteService,
      isPending: isDeleting,
    },
  } = useServiceActions();

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) setInternalOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen) {
      setConfirmationStep("initial");
      setImpactedCount(0);
    }
  };

  const onDelete = async (force = false) => {
    try {
      await deleteService({
        service: { id: serviceId },
        barbershop: { id: barbershopId },
        force,
      });

      haptic.trigger("success");
      toast.success("Servicio eliminado exitosamente");
      handleOpenChange(false);
    } catch (error) {
      const errorMessage = getConvexErrorMessage(error);
      const willCancelCount = parseWillCancelError(errorMessage);

      if (willCancelCount !== null && !force) {
        setImpactedCount(willCancelCount);
        setConfirmationStep("confirm_cancellation");
      } else {
        haptic.trigger("error");
        toast.error(errorMessage);
      }
    }
  };

  const isInitialStep = confirmationStep === "initial";

  const dialogTitle = isInitialStep
    ? "Eliminar servicio"
    : "Confirmar cancelación de citas";

  const dialogDescription = isInitialStep
    ? "¿Estás seguro que deseas eliminar este servicio? Esta acción no se puede deshacer."
    : `Este servicio tiene ${impactedCount} cita(s) pendiente(s) que serán canceladas. Los clientes serán notificados.`;

  const buttonLabel = isInitialStep
    ? "Sí, eliminar"
    : `Eliminar y cancelar ${impactedCount} cita(s)`;

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange}>
      {trigger ? <ResponsiveModalTrigger render={trigger} /> : null}
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
              disabled={isDeleting}
            >
              Cancelar
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => onDelete(!isInitialStep)}
            disabled={isDeleting}
          >
            {isDeleting && <Spinner />}
            {buttonLabel}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
