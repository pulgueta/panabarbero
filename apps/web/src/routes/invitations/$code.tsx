import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  invitationByCodeQueryOptions,
  useBarbershopMemberActions,
  useInvitationByCode,
} from "@/hooks/use-barbershop-members";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";
import { getConvexErrorMessage } from "@/lib/convex-errors";

export const Route = createFileRoute("/invitations/$code")({
  pendingComponent: LoadingComponent,
  component: InvitationPage,
  loader: async ({ context, params }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      await context.queryClient.ensureQueryData(
        invitationByCodeQueryOptions(params.code),
      );
    }
  },
});

function InvitationPage() {
  const { code } = Route.useParams();
  const navigate = Route.useNavigate();

  const {
    data: invitationData,
    refetch: refetchInvitation,
    isFetching,
  } = useInvitationByCode(code);

  const { data: session } = useSession();
  const {
    acceptInvitationMutation: {
      isPending: isAcceptingInvitation,
      mutateAsync: acceptInvitation,
    },
    denyInvitationMutation: {
      isPending: isDenyingInvitation,
      mutateAsync: denyInvitation,
    },
    validateInvitationMutation: {
      isPending: isValidatingInvitation,
      mutateAsync: validateInvitation,
    },
  } = useBarbershopMemberActions();

  useEffect(() => {
    if (invitationData?.isExpired) {
      validateInvitation(
        { code },
        {
          onSuccess: () => {
            toast.info(
              "La invitación expiró. Hemos reenviado un nuevo enlace.",
            );
            refetchInvitation();
          },
          onError: (error) => {
            toast.error(getConvexErrorMessage(error));
          },
        },
      );
    }
  }, [code, invitationData?.isExpired, refetchInvitation, validateInvitation]);

  const statusLabel = useMemo(() => {
    if (!invitationData?.invitation) return "not_found";

    if (invitationData.invitation.status !== "pending") {
      return invitationData.invitation.status;
    }

    if (invitationData.isExpired) return "expired";

    return "pending";
  }, [invitationData]);

  const handleAccept = async () => {
    try {
      await acceptInvitation({ code });
      toast.success("Invitación aceptada.");
      navigate({ to: "/profile", search: { tab: "account" } });
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    }
  };

  const handleDeny = async () => {
    try {
      await denyInvitation({ code });
      toast.success("Has rechazado la invitación.");
      navigate({ to: "/" });
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    }
  };

  if (!session?.userId) {
    return (
      <BorderContainer className="space-y-4">
        <h1 className="font-semibold text-2xl">Inicia sesión</h1>
        <p className="text-muted-foreground text-sm">
          Necesitas iniciar sesión para gestionar esta invitación.
        </p>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              navigate({
                to: "/login",
                search: { redirect: `/invitations/${code}` },
              })
            }
          >
            Iniciar sesión
          </Button>
          <Button variant="ghost" onClick={() => navigate({ to: "/" })}>
            Volver
          </Button>
        </div>
      </BorderContainer>
    );
  }

  if (!invitationData?.invitation && !isFetching) {
    return (
      <BorderContainer className="space-y-4">
        <h1 className="font-semibold text-2xl">Invitación no encontrada</h1>
        <p className="text-muted-foreground text-sm">
          El enlace de invitación no es válido o ya fue utilizado.
        </p>
        <Button onClick={() => navigate({ to: "/" })}>Volver al inicio</Button>
      </BorderContainer>
    );
  }

  const isDisabled =
    statusLabel !== "pending" || isAcceptingInvitation || isDenyingInvitation;

  return (
    <BorderContainer className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-2xl">Invitación</h1>
          <Badge variant={statusLabel === "pending" ? "default" : "secondary"}>
            {statusLabel === "pending"
              ? "Pendiente"
              : statusLabel === "accepted"
                ? "Aceptada"
                : statusLabel === "denied"
                  ? "Rechazada"
                  : "Expirada"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          {invitationData?.inviterName ?? "Un administrador"} te invitó a unirte
          a <strong>{invitationData?.barbershopName}</strong>.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="w-full sm:w-auto"
          disabled={isDisabled || isValidatingInvitation}
          onClick={handleAccept}
        >
          Aceptar invitación
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          disabled={isDisabled || isValidatingInvitation}
          onClick={handleDeny}
        >
          Rechazar
        </Button>
      </div>

      {statusLabel !== "pending" && (
        <p className="text-muted-foreground text-sm">
          Esta invitación ya no se puede gestionar.
        </p>
      )}
    </BorderContainer>
  );
}
