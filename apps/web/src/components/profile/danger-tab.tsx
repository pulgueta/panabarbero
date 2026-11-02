import type { Barbershop } from "@convex/schema";
import { TrashIcon, WarningOctagonIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import type { FC } from "react";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopActions } from "@/hooks/barbershop/use-barbershop";
import { useAccountActions } from "@/hooks/use-profile";
import { getConvexErrorMessage } from "@/lib/convex-errors";

const ConfirmationDialog = lazy(() =>
  import("@/components/confirmation-dialog").then((module) => ({
    default: module.ConfirmationDialog,
  })),
);

interface DangerTabProps {
  barbershopId?: Barbershop["_id"];
  isOwner: boolean;
  isBarber: boolean;
  isStaff: boolean;
}

function accountConsequences(
  isOwner: boolean,
  isBarber: boolean,
  isStaff: boolean,
): string[] {
  if (isOwner) {
    return [
      "Tu barbería, servicios, citas y equipo serán eliminados permanentemente.",
      "Los clientes con citas futuras recibirán una notificación de cancelación.",
      "Asumes plena responsabilidad por las reclamaciones de clientes afectados.",
    ];
  }
  if (isBarber || isStaff) {
    return [
      "Tus citas asignadas serán reasignadas al siguiente barbero disponible.",
      "Si no hay disponibilidad, las citas serán canceladas y los clientes notificados.",
      "El propietario recibirá un resumen de los cambios realizados.",
      "Tu perfil, reseñas y datos personales serán eliminados.",
    ];
  }
  return [
    "Tu perfil, reseñas y notificaciones serán eliminados.",
    "Las citas pasadas quedan en el historial de cada barbería como registro operativo.",
  ];
}

export const DangerTab: FC<DangerTabProps> = ({
  barbershopId,
  isOwner,
  isBarber,
  isStaff,
}) => {
  const navigate = useNavigate();
  const haptic = useWebHaptics();
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

  const {
    deleteBarbershopMutation: {
      mutateAsync: deleteBarbershop,
      isPending: isDeletingBarbershop,
    },
  } = useBarbershopActions();

  const {
    deleteAccountMutation: {
      mutateAsync: deleteAccount,
      isPending: isDeletingAccount,
    },
  } = useAccountActions();

  const handleDeleteBarbershop = async () => {
    if (!barbershopId) return;

    try {
      await deleteBarbershop({ id: barbershopId });
      haptic.trigger("success");
      navigate({
        to: "/barbershops",
        search: { city: undefined, state: undefined },
        replace: true,
      });
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount({});
      haptic.trigger("success");
      window.location.href = "/";
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
      setIsDeleteAccountOpen(false);
    }
  };

  const consequences = accountConsequences(isOwner, isBarber, isStaff);

  const accountDescription = isOwner
    ? "Elimina tu cuenta y tu barbería completa de forma permanente."
    : isBarber || isStaff
      ? "Elimina tu cuenta. Tus citas asignadas se redistribuirán."
      : "Elimina tu perfil y todos tus datos de la plataforma.";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-destructive">
        <WarningOctagonIcon weight="fill" className="size-4" />
        <span className="font-semibold text-sm">Zona de riesgo</span>
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-xl border border-destructive/20">
        {isOwner && (
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="font-medium text-sm">Eliminar barbería</p>
              <p className="max-w-sm text-muted-foreground text-xs">
                Elimina la barbería, sus servicios, citas y miembros. Tu cuenta
                permanece activa.
              </p>
            </div>
            <Suspense fallback={null}>
              <ConfirmationDialog
                title="Eliminar barbería"
                description="Esta acción eliminará la barbería y todos sus datos relacionados. No se puede deshacer."
                trigger={
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={!barbershopId || isDeletingBarbershop}
                    className="shrink-0"
                  >
                    <TrashIcon />
                    Eliminar barbería
                  </Button>
                }
                confirmLabel={
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={!barbershopId || isDeletingBarbershop}
                    onClick={handleDeleteBarbershop}
                  >
                    {isDeletingBarbershop && <Spinner />} Sí, eliminar
                  </Button>
                }
              />
            </Suspense>
          </div>
        )}

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="font-medium text-sm">Eliminar cuenta</p>
            <p className="max-w-sm text-muted-foreground text-xs">
              {accountDescription}
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="shrink-0"
            onClick={() => setIsDeleteAccountOpen(true)}
          >
            <TrashIcon />
            Eliminar cuenta
          </Button>
        </div>
      </div>

      <ResponsiveModal
        open={isDeleteAccountOpen}
        onOpenChange={setIsDeleteAccountOpen}
      >
        <ResponsiveModalContent>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>¿Eliminar tu cuenta?</ResponsiveModalTitle>
          </ResponsiveModalHeader>

          <div className="px-4 pb-2">
            <p className="mb-3 text-muted-foreground text-sm">
              Esta acción es inmediata e irreversible. Lo siguiente ocurrirá:
            </p>
            <ul className="space-y-2">
              {consequences.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-muted-foreground text-sm"
                >
                  <span className="mt-px shrink-0 text-destructive">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <ResponsiveModalFooter>
            <Button
              variant="destructive"
              className="w-full"
              disabled={isDeletingAccount}
              onClick={handleDeleteAccount}
            >
              {isDeletingAccount && <Spinner />}
              Sí, eliminar mi cuenta
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={isDeletingAccount}
              onClick={() => setIsDeleteAccountOpen(false)}
            >
              Cancelar
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </div>
  );
};
