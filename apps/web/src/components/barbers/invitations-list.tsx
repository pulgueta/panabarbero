import type { Barbershop } from "@convex/schema";
import { EnvelopeSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import type { FC } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvitationActions, useInvitations } from "@/hooks/use-invitations";
import { getConvexErrorMessage } from "@/lib/convex-errors";

const STATE_META: Record<
  string,
  { label: string; variant: BadgeProps["variant"] }
> = {
  pending: { label: "Pendiente", variant: "warning" },
  accepted: { label: "Aceptada", variant: "success" },
  successful: { label: "Aceptada", variant: "success" },
  declined: { label: "Rechazada", variant: "destructive" },
  expired: { label: "Expirada", variant: "destructive" },
  revoked: { label: "Revocada", variant: "destructive" },
};

const ROLE_LABELS: Record<string, string> = {
  barber: "Barbero",
  staff: "Recepcionista",
  owner: "Dueño",
};

interface InvitationsListProps {
  barbershopId: Barbershop["_id"];
}

export const InvitationsList: FC<InvitationsListProps> = ({ barbershopId }) => {
  const haptic = useWebHaptics();

  const { data: invitations, isPending } = useInvitations(barbershopId);
  const {
    revokeMutation: { mutateAsync: revoke, isPending: isRevoking },
    resendMutation: { mutateAsync: resend, isPending: isResending },
  } = useInvitationActions(barbershopId);

  const handleRevoke = async (invitationId: string) => {
    try {
      await revoke({ barbershopId, invitationId });
      haptic.trigger("success");
      toast.success("Invitación revocada");
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
  };

  const handleResend = async (invitationId: string) => {
    try {
      await resend({ barbershopId, invitationId });
      haptic.trigger("success");
      toast.success("Invitación reenviada");
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
  };

  if (isPending) {
    return (
      <div className="space-y-2">
        {["a", "b", "c"].map((key) => (
          <Skeleton key={key} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!invitations || invitations.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No hay invitaciones.</EmptyTitle>
          <EmptyDescription>
            Las invitaciones que envíes a tu equipo aparecerán aquí.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const isBusy = isRevoking || isResending;

  return (
    <ul className="space-y-2">
      {invitations.map((invitation) => {
        const isPendingInvite = invitation.state === "pending";
        const stateMeta = STATE_META[invitation.state] ?? {
          label: invitation.state,
          variant: "secondary" as const,
        };

        return (
          <li
            key={invitation.id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-sm">{invitation.email}</p>
              <p className="text-muted-foreground text-xs">
                {ROLE_LABELS[invitation.role] ?? invitation.role}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={stateMeta.variant}>{stateMeta.label}</Badge>

              {isPendingInvite && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Reenviar invitación"
                    disabled={isBusy}
                    onClick={() => handleResend(invitation.id)}
                  >
                    <EnvelopeSimpleIcon />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Revocar invitación"
                    disabled={isBusy}
                    onClick={() => handleRevoke(invitation.id)}
                  >
                    <TrashIcon />
                  </Button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};
