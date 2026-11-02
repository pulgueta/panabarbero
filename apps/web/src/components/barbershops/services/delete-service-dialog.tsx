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

interface DeleteServiceImpact {
  /** Citas whose ONLY service is this one — they get cancelled. */
  cancelCount: number;
  /** Multi-service citas — they lose this line but survive. */
  updateCount: number;
}

/**
 * Parses the "WILL_CANCEL:N:WILL_UPDATE:M" error message from the backend
 * (the ":WILL_UPDATE:M" suffix is absent on messages from older deploys).
 * Returns the impact counts if matched, otherwise null.
 */
function parseWillCancelError(
  errorMessage: string,
): DeleteServiceImpact | null {
  const match = errorMessage.match(/WILL_CANCEL:(\d+)(?::WILL_UPDATE:(\d+))?/);

  if (!match) {
    return null;
  }

  return {
    cancelCount: Number.parseInt(match[1], 10),
    updateCount: match[2] ? Number.parseInt(match[2], 10) : 0,
  };
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
  const [impact, setImpact] = useState<DeleteServiceImpact>({
    cancelCount: 0,
    updateCount: 0,
  });

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
      setImpact({ cancelCount: 0, updateCount: 0 });
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
      const parsedImpact = parseWillCancelError(errorMessage);

      if (parsedImpact !== null && !force) {
        setImpact(parsedImpact);
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
    : "Confirmar cambios en citas";

  const impactSummary = [
    impact.cancelCount > 0
      ? `${impact.cancelCount} cita(s) solo incluyen este servicio y serán canceladas`
      : null,
    impact.updateCount > 0
      ? `${impact.updateCount} cita(s) lo combinan con otros servicios y se actualizarán (se quita este servicio; el resto de la cita sigue confirmada)`
      : null,
  ]
    .filter(Boolean)
    .join(". ");

  const dialogDescription = isInitialStep
    ? "¿Estás seguro que deseas eliminar este servicio? Esta acción no se puede deshacer."
    : `${impactSummary}. Los clientes serán notificados.`;

  const buttonLabel = isInitialStep
    ? "Sí, eliminar"
    : impact.cancelCount > 0 && impact.updateCount > 0
      ? `Eliminar (cancela ${impact.cancelCount}, actualiza ${impact.updateCount})`
      : impact.updateCount > 0
        ? `Eliminar y actualizar ${impact.updateCount} cita(s)`
        : `Eliminar y cancelar ${impact.cancelCount} cita(s)`;

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
