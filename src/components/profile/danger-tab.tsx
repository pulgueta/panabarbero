import type { Barbershop } from "@convex/schema";
import { useNavigate } from "@tanstack/react-router";
import type { FC } from "react";
import { lazy } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopActions } from "@/hooks/barbershop/use-barbershop";
import { getConvexErrorMessage } from "@/lib/convex-errors";

const ConfirmationDialog = lazy(() =>
  import("@/components/confirmation-dialog").then((module) => ({
    default: module.ConfirmationDialog,
  })),
);

interface DangerTabProps {
  barbershopId?: Barbershop["_id"];
}

export const DangerTab: FC<DangerTabProps> = ({
  barbershopId,
}: {
  barbershopId?: Barbershop["_id"];
}) => {
  const navigate = useNavigate();

  const haptic = useWebHaptics();

  const {
    deleteBarbershopMutation: {
      mutateAsync: deleteBarbershop,
      isPending: isDeletingBarbershop,
    },
  } = useBarbershopActions();

  const handleDelete = async () => {
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

      return;
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-xl border p-4">
      <header className="space-y-2">
        <h1 className="text-balance text-center font-semibold text-xl">
          Eliminar barbería
        </h1>
        <p className="text-pretty text-center text-muted-foreground text-sm">
          Esta acción elimina la barbería, todos sus servicios, citas y
          miembros. No se puede deshacer.
        </p>
      </header>

      <ConfirmationDialog
        title="Eliminar barbería"
        description="¿Estás seguro? Esta acción eliminará la barbería y todos sus datos relacionados."
        trigger={
          <Button
            variant="destructive"
            disabled={!barbershopId || isDeletingBarbershop}
            className="mx-auto mt-4 w-full"
          >
            Eliminar barbería
          </Button>
        }
        confirmLabel={
          <Button
            variant="destructive"
            className="w-full"
            disabled={!barbershopId || isDeletingBarbershop}
            onClick={handleDelete}
          >
            {isDeletingBarbershop && <Spinner />} Sí, eliminar
          </Button>
        }
      />
    </div>
  );
};
