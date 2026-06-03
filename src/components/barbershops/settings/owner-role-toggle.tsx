import type { Barbershop } from "@convex/schema";
import type { FC } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  useBarbershopMemberActions,
  useBarbershopMembersByBarbershopId,
} from "@/hooks/use-barbershop-members";
import { getConvexErrorMessage } from "@/lib/convex-errors";

interface OwnerRoleToggleProps {
  barbershopId: Barbershop["_id"];
  isCurrentlyBarber: boolean;
}

interface PendingAppointment {
  _id: string;
  customerName: string;
  date: number;
  serviceId: string;
}

export const OwnerRoleToggle: FC<OwnerRoleToggleProps> = ({
  barbershopId,
  isCurrentlyBarber,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [pendingAppointments, setPendingAppointments] = useState<
    PendingAppointment[]
  >([]);
  const [reassignments, setReassignments] = useState<Record<string, string>>(
    {},
  );

  const haptic = useWebHaptics();

  const { data: allMembers } = useBarbershopMembersByBarbershopId(barbershopId);
  const {
    toggleBarberRoleMutation: {
      mutateAsync: toggleBarberRole,
      isPending: isToggling,
    },
  } = useBarbershopMemberActions();

  // Get barbers that are NOT the current owner (for reassignment targets)
  const otherBarbers = allMembers.filter(
    (m) => m.roles.includes("barber") && !m.roles.includes("owner"),
  );

  const handleAddBarberRole = async () => {
    try {
      await toggleBarberRole({
        barbershopId,
        addBarberRole: true,
      });
      haptic.trigger("success");
      toast.success("Ahora también eres barbero en tu barbería");
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
    setConfirmOpen(false);
  };

  const handleRemoveBarberRole = async () => {
    try {
      const result = await toggleBarberRole({
        barbershopId,
        addBarberRole: false,
      });

      if (
        result &&
        typeof result === "object" &&
        "status" in result &&
        result.status === "needs-reassignment"
      ) {
        // There are future appointments that need reassignment
        const appointments =
          "appointments" in result
            ? (result.appointments as PendingAppointment[])
            : [];
        setPendingAppointments(appointments);
        setReassignments({});
        setConfirmOpen(false);
        setReassignOpen(true);
        return;
      }

      haptic.trigger("success");
      toast.success("Ya no atiendes como barbero en tu barbería");
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
    setConfirmOpen(false);
  };

  const handleReassignAndRemove = async () => {
    // Validate all appointments have a reassignment
    const allReassigned = pendingAppointments.every(
      (appt) => reassignments[appt._id],
    );

    if (!allReassigned) {
      toast.error("Debes reasignar todas las citas antes de continuar");
      return;
    }

    try {
      await toggleBarberRole({
        barbershopId,
        addBarberRole: false,
        reassignments: Object.entries(reassignments).map(
          ([appointmentId, targetBarbershopMemberId]) => ({
            appointmentId,
            targetBarbershopMemberId,
          }),
        ),
      });

      haptic.trigger("success");
      toast.success("Citas reasignadas. Ya no atiendes como barbero.");
      setReassignOpen(false);
      setPendingAppointments([]);
      setReassignments({});
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
  };

  const updateReassignment = (appointmentId: string, memberId: string) => {
    setReassignments((prev) => ({
      ...prev,
      [appointmentId]: memberId,
    }));
  };

  return (
    <>
      <div className="flex flex-col gap-[0.745rem]">
        <Badge variant={isCurrentlyBarber ? "default" : "secondary"}>
          {isCurrentlyBarber ? "Dueño y Barbero" : "Solo Dueño"}
        </Badge>

        <Button
          variant="outline"
          onClick={() => setConfirmOpen(true)}
          disabled={isToggling}
        >
          {isToggling && <Spinner />}
          {isCurrentlyBarber
            ? "Dejar de atender como barbero"
            : "Empezar a atender como barbero"}
        </Button>
      </div>

      <ResponsiveModal open={confirmOpen} onOpenChange={setConfirmOpen}>
        <ResponsiveModalContent>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>
              {isCurrentlyBarber
                ? "Dejar de atender como barbero"
                : "Empezar a atender como barbero"}
            </ResponsiveModalTitle>
            <ResponsiveModalDescription>
              {isCurrentlyBarber
                ? "Al dejar de ser barbero, tus citas activas serán reasignadas a otro barbero o canceladas. Tus servicios asignados serán eliminados. Seguirás gestionando la barbería como dueño."
                : "Al convertirte en barbero, podrás recibir citas de clientes y se te podrán asignar servicios."}
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isToggling}
            >
              Cancelar
            </Button>
            <Button
              variant={isCurrentlyBarber ? "destructive" : "default"}
              onClick={
                isCurrentlyBarber ? handleRemoveBarberRole : handleAddBarberRole
              }
              disabled={isToggling}
            >
              {isToggling && <Spinner />}
              {isCurrentlyBarber
                ? "Confirmar cambio"
                : "Activar rol de barbero"}
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      {/* Reassignment dialog */}
      <ResponsiveModal open={reassignOpen} onOpenChange={setReassignOpen}>
        <ResponsiveModalContent className="max-h-[80vh] overflow-y-auto">
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Reasignar citas</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Tienes {pendingAppointments.length} cita
              {pendingAppointments.length !== 1 ? "s" : ""} pendiente
              {pendingAppointments.length !== 1 ? "s" : ""} como barbero.
              Selecciona a qué barbero reasignar cada cita.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>

          <div className="space-y-4 py-4">
            {otherBarbers.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No hay otros barberos en tu equipo. Las citas serán canceladas
                automáticamente.
              </p>
            ) : (
              pendingAppointments.map((appt) => (
                <div key={appt._id} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      {appt.customerName}
                    </span>
                    <span
                      className="text-muted-foreground text-xs"
                      suppressHydrationWarning
                    >
                      {new Date(appt.date).toLocaleDateString("es-CO", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <Select
                    value={
                      otherBarbers.find(
                        (barber) => barber._id === reassignments[appt._id],
                      )?.name ?? ""
                    }
                    onValueChange={(value) => {
                      const selectedBarber = otherBarbers.find(
                        (barber) => barber.name === value,
                      );

                      if (selectedBarber) {
                        updateReassignment(appt._id, selectedBarber._id);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un barbero" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherBarbers.map((barber) => (
                        <SelectItem key={barber._id} value={barber.name}>
                          {barber.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))
            )}
          </div>

          <ResponsiveModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReassignOpen(false);
                setPendingAppointments([]);
                setReassignments({});
              }}
              disabled={isToggling}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReassignAndRemove}
              disabled={
                isToggling ||
                (otherBarbers.length > 0 &&
                  pendingAppointments.some((a) => !reassignments[a._id]))
              }
            >
              {isToggling && <Spinner />}
              {otherBarbers.length === 0
                ? "Cancelar citas y continuar"
                : "Reasignar y continuar"}
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </>
  );
};
