import type { Barbershop } from "@panabarbero/convex/schemas";
import { useNavigate } from "@tanstack/react-router";
import type { FC } from "react";
import { useLayoutEffect } from "react";
import { toast } from "sonner";

import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopActions } from "@/hooks/barbershop/use-barbershop";
import { getConvexErrorMessage } from "@/lib/convex-errors";

interface DangerTabProps {
  barbershopId?: Barbershop["_id"];
}

export const DangerTab: FC<DangerTabProps> = ({
  barbershopId,
}: {
  barbershopId?: Barbershop["_id"];
}) => {
  const navigate = useNavigate();
  const {
    deleteBarbershopMutation: {
      mutateAsync: deleteBarbershop,
      isPending: isDeletingBarbershop,
      isSuccess: isDeletedBarbershop,
    },
  } = useBarbershopActions();

  const handleDelete = async () => {
    if (!barbershopId) return;

    try {
      await deleteBarbershop({ barbershopId });
    } catch (error) {
      toast.error(getConvexErrorMessage(error));

      return;
    }
  };

  useLayoutEffect(() => {
    if (isDeletedBarbershop) {
      toast.success("Barbería eliminada exitosamente");
      navigate({
        to: "/barbershops",
        search: { city: undefined, state: undefined },
        replace: true,
      });
    }
  }, [isDeletedBarbershop, navigate]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-semibold text-2xl">Eliminar barbería</h1>
        <p className="text-muted-foreground text-sm">
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
