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
import { useCancelMpSubscription } from "@/hooks/billing/use-mercadopago";
import { getConvexErrorMessage } from "@/lib/convex-errors";

/** Payer-side subscription management hub inside the MercadoPago account. */
export const MP_SUBSCRIPTIONS_URL =
  "https://www.mercadopago.com.co/subscriptions";

interface CancelSubscriptionDialogProps {
  trigger: ReactElement;
  /** Display name of the plan being cancelled (e.g. "Barbería"). */
  planName: string;
}

/**
 * Explicit confirmation gate for cancelling the paid MercadoPago subscription.
 * A cancelled preapproval is terminal at MercadoPago (only paused ones can be
 * reactivated), so no button may cancel without passing through this dialog.
 */
export const CancelSubscriptionDialog: FC<CancelSubscriptionDialogProps> = ({
  trigger,
  planName,
}) => {
  const haptic = useWebHaptics();

  const [open, setOpen] = useState<boolean>(false);
  const { mutateAsync: cancel, isPending: isCancelling } =
    useCancelMpSubscription();

  const onConfirm = async () => {
    try {
      await cancel({});

      haptic.trigger("success");
      toast.success("Suscripción cancelada. Tu cuenta pasó al plan gratis.");
      setOpen(false);
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
  };

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Cancelar suscripción</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            ¿Estás seguro que deseas cancelar tu plan {planName}? Tu cuenta
            pasará al plan gratis de inmediato y esta acción no se puede
            deshacer: para volver a un plan pago deberás suscribirte de nuevo.
            También puedes gestionar tus suscripciones desde{" "}
            <a
              href={MP_SUBSCRIPTIONS_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline underline-offset-4"
            >
              tu cuenta de MercadoPago
            </a>
            .
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCancelling}
          >
            Volver
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isCancelling}
          >
            {isCancelling && <Spinner />}
            Sí, cancelar suscripción
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
