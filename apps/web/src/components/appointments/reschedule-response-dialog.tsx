import type { Appointment } from "@convex/schema";
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
import { useAppointmentActions } from "@/hooks/use-appointments";
import { useSession } from "@/hooks/use-session";
import { getConvexErrorMessage } from "@/lib/convex-errors";

interface RescheduleResponseDialogProps {
  appointment: Appointment & {
    rescheduleRequestedByUserId?: string | null;
  };
  trigger: ReactElement;
  viewer: "barber" | "customer";
}

const formatDateTime = (timestamp?: number) => {
  if (!timestamp) return "Sin definir";

  return new Date(timestamp).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const RescheduleResponseDialog: FC<RescheduleResponseDialogProps> = ({
  appointment,
  trigger,
  viewer,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const haptic = useWebHaptics();

  const { data: session } = useSession();
  const {
    answerRescheduleRequest: {
      mutateAsync: answerReschedule,
      isPending: isAnswering,
    },
  } = useAppointmentActions();

  const requesterUserId = appointment.rescheduleRequestedByUserId;
  const isRequester = requesterUserId && requesterUserId === session?.id;
  const hasPendingProposal = Boolean(
    requesterUserId && appointment.proposedDate,
  );
  // Compare sides, not people, exactly like answerRescheduleRequest: only the
  // counterpart of the requester's side may answer.
  const requesterIsCustomer = requesterUserId === appointment.userId;
  const viewerIsCustomer = session?.id === appointment.userId;
  const canRespond =
    hasPendingProposal &&
    Boolean(session) &&
    requesterIsCustomer !== viewerIsCustomer;
  const isExpired =
    hasPendingProposal && (appointment.proposedDate ?? 0) < Date.now();

  const handleAnswer = async (accepted: boolean) => {
    try {
      await answerReschedule({
        appointment: { id: appointment._id },
        accepted,
        answeredBy: viewer,
      });

      haptic.trigger("success");
      toast.success(
        accepted
          ? "Solicitud de reagendamiento aceptada."
          : "Solicitud de reagendamiento rechazada.",
      );
      setIsOpen(false);
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));

      return;
    }
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
      <ResponsiveModalTrigger nativeButton render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            Solicitud de reagendamiento
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {canRespond
              ? "Revisa las fechas antes de responder."
              : isRequester
                ? "Estos son los detalles de tu solicitud."
                : "Estos son los detalles de la solicitud."}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="space-y-2 text-sm">
          <div className="flex flex-col">
            <p className="text-muted-foreground">Fecha original</p>
            <p className="font-medium">{formatDateTime(appointment.date)}</p>
          </div>
          <div className="flex flex-col">
            <p className="text-muted-foreground">Nueva fecha propuesta</p>
            <p className="font-medium">
              {formatDateTime(appointment.proposedDate ?? undefined)}
            </p>
          </div>
          {isExpired && (
            <p className="text-muted-foreground">La hora propuesta ya pasó.</p>
          )}
          {hasPendingProposal && !canRespond && (
            <p className="text-muted-foreground">
              {requesterIsCustomer
                ? "Esperando respuesta de la barbería."
                : "Esperando respuesta del cliente."}
            </p>
          )}
        </div>

        {canRespond && (
          <ResponsiveModalFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="destructive"
              disabled={isAnswering}
              onClick={() => handleAnswer(false)}
            >
              Rechazar
            </Button>
            {!isExpired && (
              <Button
                type="button"
                variant="secondary"
                disabled={isAnswering}
                onClick={() => handleAnswer(true)}
              >
                {isAnswering && <Spinner />}
                Aceptar
              </Button>
            )}
          </ResponsiveModalFooter>
        )}
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
