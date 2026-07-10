import type { BarbershopMemberWithName } from "@convex/schema";
import type { FC } from "react";
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
} from "@/components/ui/responsive-modal";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopMemberActions } from "@/hooks/use-barbershop-members";
import { getConvexErrorMessage } from "@/lib/convex-errors";

function parseWillCancelError(errorMessage: string): number | null {
  const match = errorMessage.match(/WILL_CANCEL:(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

interface RemoveMemberDialogProps {
  member: BarbershopMemberWithName;
  variant: "barber" | "staff";
}

/**
 * Destructive remove flow for a team member. Barber removals surface a second
 * confirmation when pending appointments would be cancelled (WILL_CANCEL);
 * staff removals are single-step. Preserves the membership mutations verbatim.
 */
export const RemoveMemberDialog: FC<RemoveMemberDialogProps> = ({
  member,
  variant,
}) => {
  const [open, setOpen] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState<
    "initial" | "confirm_cancellation"
  >("initial");
  const [impactedCount, setImpactedCount] = useState(0);
  const haptic = useWebHaptics();

  const {
    removeBarberMutation: {
      mutateAsync: removeBarber,
      isPending: isRemovingBarber,
    },
    removeStaffMutation: {
      mutateAsync: removeStaff,
      isPending: isRemovingStaff,
    },
  } = useBarbershopMemberActions();

  const isPending = variant === "barber" ? isRemovingBarber : isRemovingStaff;

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setConfirmationStep("initial");
      setImpactedCount(0);
    }
  };

  const handleRemove = async (force = false) => {
    try {
      if (variant === "barber") {
        await removeBarber({ id: member._id, force });
      } else {
        await removeStaff({ id: member._id });
      }
      haptic.trigger("success");
      toast.success(`${member.name} fue eliminado del equipo`);
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

  const roleLabel = variant === "barber" ? "barbero" : "recepcionista";

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        {isPending && <Spinner />}
        Eliminar
      </Button>

      <ResponsiveModal open={open} onOpenChange={handleOpenChange}>
        <ResponsiveModalContent>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>
              {confirmationStep === "initial"
                ? `Eliminar a ${member.name}`
                : "Confirmar cancelación de citas"}
            </ResponsiveModalTitle>
            <ResponsiveModalDescription>
              {confirmationStep === "initial"
                ? `Esta acción removerá a este ${roleLabel} de tu barbería y perderá el acceso ${variant === "barber" ? "a los servicios asignados" : "al panel de gestión"}.`
                : `Este barbero tiene ${impactedCount} cita(s) pendiente(s) que serán canceladas. Los clientes serán notificados.`}
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                handleRemove(confirmationStep === "confirm_cancellation")
              }
              disabled={isPending}
            >
              {isPending && <Spinner />}
              {confirmationStep === "initial"
                ? "Sí, eliminar"
                : `Eliminar y cancelar ${impactedCount} cita(s)`}
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
};
