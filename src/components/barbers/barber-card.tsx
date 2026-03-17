/** biome-ignore-all lint/style/noNonNullAssertion: for now */
import type { BarbershopMemberWithName, Service } from "@convex/schema";
import type { FC } from "react";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  useBarbershopMemberActions,
  useServicesForBarber,
} from "@/hooks/use-barbershop-members";
import { getConvexErrorMessage } from "@/lib/convex-errors";

function parseWillCancelError(errorMessage: string): number | null {
  const match = errorMessage.match(/WILL_CANCEL:(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

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
  const [confirmationStep, setConfirmationStep] = useState<
    "initial" | "confirm_cancellation"
  >("initial");
  const [impactedCount, setImpactedCount] = useState(0);

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

  const handleRemoveOpenChange = (open: boolean) => {
    setRemoveOpen(open);
    if (!open) {
      setConfirmationStep("initial");
      setImpactedCount(0);
    }
  };

  const handleRemoveBarber = async (force = false) => {
    try {
      await removeBarber({ id: barbershopMember._id, force });
      haptic.trigger("success");
      toast.success(`${barbershopMember.name} fue eliminado de la barbería`);
      handleRemoveOpenChange(false);
    } catch (error) {
      const errorMessage = getConvexErrorMessage(error);
      const willCancelCount = parseWillCancelError(errorMessage);

      if (willCancelCount !== null && !force) {
        setImpactedCount(willCancelCount);
        setConfirmationStep("confirm_cancellation");
      } else {
        haptic.trigger("error");
        toast.error(errorMessage);
      }
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Avatar>
            <AvatarImage src={barbershopMember.avatarUrl} />
            <AvatarFallback>{barbershopMember.name.charAt(0)}</AvatarFallback>
          </Avatar>
          {barbershopMember.name}
        </CardTitle>
        <CardDescription className="mt-1 flex flex-wrap gap-1">
          {barbershopMember.roles.map((role) => (
            <Badge
              key={role}
              variant={role === "owner" ? "default" : "secondary"}
            >
              {role === "owner"
                ? "Dueño"
                : role === "staff"
                  ? "Recepcionista"
                  : "Barbero"}
            </Badge>
          ))}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <p className="font-medium text-muted-foreground text-sm">
            Servicios asignados:
          </p>
          {isLoadingBarberServices ? (
            <Skeleton className="h-4 w-full" />
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
        {isOwner && barberServices && (
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
              currentServices={barberServices.map((s) => s!)}
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

            <ResponsiveModal
              open={removeOpen}
              onOpenChange={handleRemoveOpenChange}
            >
              <ResponsiveModalContent>
                <ResponsiveModalHeader>
                  <ResponsiveModalTitle>
                    {confirmationStep === "initial"
                      ? `Eliminar a ${barbershopMember.name}`
                      : "Confirmar cancelación de citas"}
                  </ResponsiveModalTitle>
                  <ResponsiveModalDescription>
                    {confirmationStep === "initial"
                      ? "Esta acción removerá a este barbero de tu barbería y perderá el acceso a los servicios asignados."
                      : `Este barbero tiene ${impactedCount} cita(s) pendiente(s) que serán canceladas. Los clientes serán notificados.`}
                  </ResponsiveModalDescription>
                </ResponsiveModalHeader>
                <ResponsiveModalFooter>
                  <Button
                    variant="outline"
                    onClick={() => handleRemoveOpenChange(false)}
                    disabled={isRemovingBarber}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() =>
                      handleRemoveBarber(
                        confirmationStep === "confirm_cancellation",
                      )
                    }
                    disabled={isRemovingBarber}
                  >
                    {isRemovingBarber && <Spinner />}
                    {confirmationStep === "initial"
                      ? "Sí, eliminar"
                      : `Eliminar y cancelar ${impactedCount} cita(s)`}
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
