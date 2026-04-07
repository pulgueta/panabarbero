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

const ROLE_LABELS: Record<string, string> = {
  owner: "Dueño",
  barber: "Barbero",
  staff: "Recepcionista",
};

const ManageServicesDialog = lazy(() =>
  import("./manage-services-dialog").then((module) => ({
    default: module.ManageServicesDialog,
  })),
);

const BarberScheduleDialog = lazy(() =>
  import("../barbershops/availability/barber-schedule-dialog").then(
    (module) => ({
      default: module.BarberScheduleDialog,
    }),
  ),
);

function parseWillCancelError(errorMessage: string): number | null {
  const match = errorMessage.match(/WILL_CANCEL:(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

/** Renders the assigned-services list for a barber member. */
const BarberServices: FC<{ memberId: BarbershopMemberWithName["_id"] }> = ({
  memberId,
}) => {
  const { data: barberServices, isLoading } = useServicesForBarber(memberId);

  if (isLoading) return <Skeleton className="h-4 w-full" />;

  if (!barberServices || barberServices.length === 0) {
    return (
      <p className="text-muted-foreground text-xs italic">
        Sin servicios asignados
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {barberServices.slice(0, 3).map((service) => (
        <Badge key={service?._id} variant="outline">
          {service?.name}
        </Badge>
      ))}
      {barberServices.length > 3 && (
        <Badge variant="outline">+{barberServices.length - 3} más</Badge>
      )}
    </div>
  );
};

interface RemoveConfirmationProps {
  member: BarbershopMemberWithName;
  variant: "barber" | "staff";
}

const RemoveConfirmation: FC<RemoveConfirmationProps> = ({
  member,
  variant,
}) => {
  const [open, setOpen] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState<
    "initial" | "confirm_cancellation"
  >("initial");
  const [impactedCount, setImpactedCount] = useState(0);
  const haptic = useWebHaptics();

  const {
    removeBarberMutation: {
      mutateAsync: removeBarber,
      isPending: isRemovingBarber,
    },
    removeStaffMutation: {
      mutateAsync: removeStaff,
      isPending: isRemovingStaff,
    },
  } = useBarbershopMemberActions();

  const isPending = variant === "barber" ? isRemovingBarber : isRemovingStaff;

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setConfirmationStep("initial");
      setImpactedCount(0);
    }
  };

  const handleRemove = async (force = false) => {
    try {
      if (variant === "barber") {
        await removeBarber({ id: member._id, force });
      } else {
        await removeStaff({ id: member._id });
      }
      haptic.trigger("success");
      toast.success(`${member.name} fue eliminado del equipo`);
      handleOpenChange(false);
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

  const roleLabel = variant === "barber" ? "barbero" : "recepcionista";

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        {isPending && <Spinner />}
        Eliminar
      </Button>

      <ResponsiveModal open={open} onOpenChange={handleOpenChange}>
        <ResponsiveModalContent>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>
              {confirmationStep === "initial"
                ? `Eliminar a ${member.name}`
                : "Confirmar cancelación de citas"}
            </ResponsiveModalTitle>
            <ResponsiveModalDescription>
              {confirmationStep === "initial"
                ? `Esta acción removerá a este ${roleLabel} de tu barbería y perderá el acceso ${variant === "barber" ? "a los servicios asignados" : "al panel de gestión"}.`
                : `Este barbero tiene ${impactedCount} cita(s) pendiente(s) que serán canceladas. Los clientes serán notificados.`}
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                handleRemove(confirmationStep === "confirm_cancellation")
              }
              disabled={isPending}
            >
              {isPending && <Spinner />}
              {confirmationStep === "initial"
                ? "Sí, eliminar"
                : `Eliminar y cancelar ${impactedCount} cita(s)`}
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
};

interface MemberCardProps {
  member: BarbershopMemberWithName;
  /** All barbershop services — only needed for barber members (service management). */
  services?: Service[];
  isOwner: boolean;
}

export const MemberCard: FC<MemberCardProps> = ({
  member,
  services,
  isOwner,
}) => {
  const [manageOpen, setManageOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const isBarber = member.roles.includes("barber");
  const isMemberOwner = member.roles.includes("owner");

  const { data: barberServices } = useServicesForBarber(
    isBarber ? member._id : (undefined as unknown as typeof member._id),
  );

  const canRemove = isOwner && !isMemberOwner;
  const canManageServices = isOwner && isBarber && barberServices;
  const canManageSchedule = isOwner && isBarber;
  const removeVariant = isBarber ? "barber" : "staff";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Avatar>
            <AvatarImage src={member.avatarUrl} />
            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
          </Avatar>
          {member.name}
        </CardTitle>
        <div className="mt-1 flex flex-wrap gap-1">
          {member.roles.map((role) => (
            <Badge
              key={role}
              variant={role === "owner" ? "default" : "secondary"}
            >
              {ROLE_LABELS[role] ?? role}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {isBarber ? (
          <div className="space-y-2">
            <p className="font-medium text-muted-foreground text-sm">
              Servicios asignados:
            </p>
            <BarberServices memberId={member._id} />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Puede gestionar citas, servicios e invitar barberos.
          </p>
        )}
      </CardContent>

      <CardFooter className="flex-wrap justify-end gap-2">
        {canManageSchedule && (
          <Suspense
            fallback={
              <Button variant="outline" disabled>
                Horario
              </Button>
            }
          >
            <BarberScheduleDialog
              member={member}
              open={scheduleOpen}
              onOpenChange={setScheduleOpen}
            />
          </Suspense>
        )}

        {canManageServices && services && (
          <Suspense
            fallback={
              <Button variant="outline" disabled>
                Gestionar servicios
              </Button>
            }
          >
            <ManageServicesDialog
              barbershopMember={member}
              services={services}
              currentServices={barberServices.map((s) => s!)}
              open={manageOpen}
              onOpenChange={setManageOpen}
            />
          </Suspense>
        )}

        {canRemove && (
          <RemoveConfirmation
            member={member}
            variant={removeVariant as "barber" | "staff"}
          />
        )}
      </CardFooter>
    </Card>
  );
};
