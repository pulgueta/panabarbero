import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  invitationByCodeQueryOptions,
  useBarbershopMemberActions,
  useInvitationByCode,
} from "@/hooks/use-barbershop-members";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";
import { getConvexErrorMessage } from "@/lib/convex-errors";

export const Route = createFileRoute("/_authedRoutes/invitations/$code")({
  pendingComponent: LoadingComponent,
  component: InvitationPage,
  loader: async ({ context, params }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      const invitation = await context.queryClient.ensureQueryData(
        invitationByCodeQueryOptions(params.code),
      );

      if (invitation && invitation.email !== user.email) {
        throw redirect({
          to: "/profile",
          search: { tab: "account" },
          replace: true,
        });
      }
    }
  },
  ssr: "data-only",
});

function InvitationPage() {
  const { code } = Route.useParams();
  const navigate = Route.useNavigate();

  const haptic = useWebHaptics();

  const { data: user } = useSession();

  const { data: invitationData, refetch: refetchInvitation } =
    useInvitationByCode(code);

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
            haptic.trigger("error");
            toast.error(getConvexErrorMessage(error));
          },
        },
      );
    }
  }, [
    code,
    invitationData?.isExpired,
    refetchInvitation,
    validateInvitation,
    haptic,
  ]);

  const statusLabel = useMemo(() => {
    if (!invitationData) return "not_found";

    if (invitationData.status !== "pending") {
      return invitationData.status;
    }

    if (invitationData.isExpired) return "expired";

    return "pending";
  }, [invitationData]);

  const handleAnswer = async (answer: "accept" | "deny") => {
    try {
      if (!user) {
        toast.error("Debes iniciar sesión para responder a la invitación.");
        haptic.trigger("error");
        return;
      }

      await answerInvitation({ code, answer });
      haptic.trigger("success");
      toast.success(
        `Invitación ${answer === "accept" ? "aceptada" : "rechazada"}.`,
      );
      navigate({ to: "/profile", search: { tab: "account" } });
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
  };

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
            Has sido invitado a unirte a{" "}
            <strong>{invitationData?.barbershopName}</strong>.
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
