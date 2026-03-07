import type { BarbershopMemberWithName, Service } from "@convex/tables";
import type { FC } from "react";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { Spinner } from "@/components/ui/spinner";
import {
  useBarbershopMemberActions,
  useServicesForBarber,
} from "@/hooks/use-barbershop-members";
import { getConvexErrorMessage } from "@/lib/convex-errors";

const ManageServicesDialog = lazy(() =>
  import("./manage-services-dialog").then((module) => ({
    default: module.ManageServicesDialog,
  })),
);

interface BarberCardProps {
  barbershopMember: BarbershopMemberWithName;
  services: Service[];
  isOwner: boolean;
}

export const BarberCard: FC<BarberCardProps> = ({
  barbershopMember,
  services,
  isOwner,
}) => {
  const [manageOpen, setManageOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const haptic = useWebHaptics();

  const { data: barberServices, isLoading: isLoadingBarberServices } =
    useServicesForBarber(barbershopMember._id);

  const {
    removeBarberMutation: {
      mutateAsync: removeBarber,
      isPending: isRemovingBarber,
    },
  } = useBarbershopMemberActions();

  const canRemoveBarber =
    isOwner &&
    barbershopMember.roles.includes("barber") &&
    !barbershopMember.roles.includes("owner");

  const handleRemoveBarber = async () => {
    try {
      await removeBarber({ barbershopMemberId: barbershopMember._id });
      haptic.trigger("success");
      toast.success(`${barbershopMember.name} fue eliminado de la barbería`);
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    } finally {
      setRemoveOpen(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{barbershopMember.name}</CardTitle>
            <CardDescription className="mt-1 flex flex-wrap gap-1">
              {barbershopMember.roles.map((role) => (
                <Badge
                  key={role}
                  variant={role === "owner" ? "default" : "secondary"}
                >
                  {role === "owner" ? "Dueño" : "Barbero"}
                </Badge>
              ))}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <p className="font-medium text-muted-foreground text-sm">
            Servicios asignados:
          </p>
          {isLoadingBarberServices ? (
            <Spinner className="size-4" />
          ) : barberServices && barberServices.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {barberServices.slice(0, 3).map((service) => (
                <Badge key={service?._id} variant="outline">
                  {service?.name}
                </Badge>
              ))}
              {barberServices.length > 3 && (
                <Badge variant="outline">
                  +{barberServices.length - 3} más
                </Badge>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs italic">
              Sin servicios asignados
            </p>
          )}
        </div>
      </CardContent>

      <CardFooter className="justify-end gap-2">
        {isOwner && (
          <Suspense
            fallback={
              <Button variant="outline" disabled>
                Gestionar servicios
              </Button>
            }
          >
            <ManageServicesDialog
              barbershopMember={barbershopMember}
              services={services}
              currentServices={barberServices ?? []}
              open={manageOpen}
              onOpenChange={setManageOpen}
            />
          </Suspense>
        )}

        {canRemoveBarber && (
          <>
            <Button
              variant="destructive"
              onClick={() => setRemoveOpen(true)}
              disabled={isRemovingBarber}
            >
              {isRemovingBarber && <Spinner />}
              Eliminar
            </Button>

            <ResponsiveModal open={removeOpen} onOpenChange={setRemoveOpen}>
              <ResponsiveModalContent>
                <ResponsiveModalHeader>
                  <ResponsiveModalTitle>
                    Eliminar a {barbershopMember.name}
                  </ResponsiveModalTitle>
                  <ResponsiveModalDescription>
                    Esta acción removerá a este barbero de tu barbería y perderá
                    el acceso a los servicios asignados.
                  </ResponsiveModalDescription>
                </ResponsiveModalHeader>
                <ResponsiveModalFooter>
                  <Button
                    variant="outline"
                    onClick={() => setRemoveOpen(false)}
                    disabled={isRemovingBarber}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleRemoveBarber}
                    disabled={isRemovingBarber}
                  >
                    {isRemovingBarber && <Spinner />}
                    Eliminar barbero
                  </Button>
                </ResponsiveModalFooter>
              </ResponsiveModalContent>
            </ResponsiveModal>
          </>
        )}
      </CardFooter>
    </Card>
  );
};
