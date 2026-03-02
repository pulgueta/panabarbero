import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useBarbershopMemberActions,
  useInvitationByCode,
} from "@/hooks/use-barbershop-members";
import { useSession } from "@/hooks/use-session";
import { getConvexErrorMessage } from "@/lib/convex-errors";

export const Route = createFileRoute("/_authedRoutes/invitations/$code")({
  pendingComponent: LoadingComponent,
  component: InvitationPage,
  // loader: async ({ context, params }) => {
  //   const user = await context.queryClient.ensureQueryData(
  //     getSessionQueryOptions(),
  //   );

  //   if (user?.userId) {
  //     const invitation = await context.queryClient.ensureQueryData(
  //       invitationByCodeQueryOptions(params.code),
  //     );

  //     if (invitation?.invitation.email !== user.email) {
  //       throw redirect({ to: "/profile", search: { tab: "account" } });
  //     }
  //   }

  //   return {
  //     user,
  //   };
  // },
});

function InvitationPage() {
  const { code } = Route.useParams();
  const navigate = Route.useNavigate();

  const { data: invitationData, refetch: refetchInvitation } =
    useInvitationByCode(code);
  const { data: user } = useSession();

  const {
    answerInvitationMutation: {
      isPending: isAnsweringInvitation,
      mutateAsync: answerInvitation,
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

  const handleAnswer = async (answer: "accept" | "deny") => {
    try {
      await answerInvitation({ code, answer });
      toast.success(
        `Invitación ${answer === "accept" ? "aceptada" : "rechazada"}.`,
      );
      navigate({ to: "/profile", search: { tab: "account" } });
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
    }
  };

  if (!user?.userId) {
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

  const isDisabled = statusLabel !== "pending" || isAnsweringInvitation;

  return (
    <BorderContainer className="flex flex-col items-center justify-center space-y-4">
      <Card className="w-full max-w-xl px-6">
        <div className="space-y-1">
          <header className="flex items-center justify-between gap-2">
            <h1 className="font-semibold text-xl sm:text-3xl">Invitación</h1>
            <Badge
              variant={statusLabel === "pending" ? "default" : "secondary"}
            >
              {statusLabel === "pending"
                ? "Pendiente"
                : statusLabel === "accepted"
                  ? "Aceptada"
                  : statusLabel === "denied"
                    ? "Rechazada"
                    : "Expirada"}
            </Badge>
          </header>
          <p className="text-muted-foreground text-xs sm:text-sm">
            {invitationData?.inviterName ?? "Un administrador"} te invitó a
            unirte a{" "}
            <strong>{invitationData?.barbershopName ?? "un barbershop"}</strong>
            .
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            className="w-full sm:w-auto"
            disabled={isDisabled || isValidatingInvitation}
            onClick={() => handleAnswer("accept")}
          >
            Aceptar invitación
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isDisabled || isValidatingInvitation}
            onClick={() => handleAnswer("deny")}
          >
            Rechazar
          </Button>
        </div>
      </Card>

      {statusLabel !== "pending" && (
        <p className="text-muted-foreground text-sm">
          Esta invitación ya no se puede gestionar.
        </p>
      )}
    </BorderContainer>
  );
}
