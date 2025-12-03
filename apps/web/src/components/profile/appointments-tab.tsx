import type { Appointment } from "@panabarbero/convex/schemas";
import { Link } from "@tanstack/react-router";
import { CalendarIcon } from "lucide-react";
import type { FC } from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { RescheduleRequestDialog } from "@/components/appointments/reschedule-request-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopsByIds } from "@/hooks/barbershop/use-barbershop";
import { useAppointmentActions } from "@/hooks/use-appointments";
import { useSession } from "@/hooks/use-session";
import {
  getAppointmentStatusBadgeVariant,
  getAppointmentStatusLabel,
} from "@/lib/appointment-utils";

interface AppointmentsTabProps {
  appointments: Appointment[];
}

export const AppointmentsTab: FC<AppointmentsTabProps> = ({ appointments }) => {
  const [actionRequest, setActionRequest] = useState<{
    appointment: Appointment;
    type: "cancel" | "delete";
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const { data: session } = useSession();
  const {
    cancelAppointmentMutation: { mutateAsync: cancelAppointment },
    deleteAppointmentMutation: { mutateAsync: deleteAppointment },
  } = useAppointmentActions();

  const { data: barbershops } = useBarbershopsByIds(
    appointments.map((appointment) => appointment.barbershopId),
  );

  const dialogTexts = useMemo(() => {
    if (!actionRequest) {
      return null;
    }

    const isDelete = actionRequest.type === "delete";

    return {
      title: isDelete ? "Borrar cita" : "Cancelar cita",
      description: isDelete
        ? "Esta acción eliminará la cita de tu historial. ¿Deseas continuar?"
        : "Esta acción cancelará la cita y notificará al barbero. ¿Deseas continuar?",
      confirmLabel: isDelete ? "Sí, borrar cita" : "Sí, cancelar cita",
    };
  }, [actionRequest]);

  const handleConfirmAction = async () => {
    if (!actionRequest) return;

    try {
      setIsProcessingAction(true);
      if (actionRequest.type === "cancel") {
        const userId = cancelledByUserId;
        if (!userId) {
          toast.error("Debes iniciar sesión para cancelar la cita.");
          setActionRequest(null);
          setIsProcessingAction(false);
          return;
        }

        await cancelAppointment({
          appointmentId: actionRequest.appointment._id,
          cancelledByUserId: userId,
        });
        toast.success("La cita fue cancelada correctamente.");
      } else {
        await deleteAppointment({
          appointmentId: actionRequest.appointment._id,
        });
        toast.success("La cita fue eliminada correctamente.");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        actionRequest.type === "cancel"
          ? "No pudimos cancelar la cita. Intenta nuevamente."
          : "No pudimos eliminar la cita. Intenta nuevamente.",
      );
    } finally {
      setIsProcessingAction(false);
      setActionRequest(null);
    }
  };

  const cancelledByUserId = session?.userId;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {appointments.length ? (
          appointments.map((appointment) => {
            const barbershop = barbershops?.find(
              (barbershop) => barbershop?._id === appointment.barbershopId,
            );

            const isCancelled =
              appointment.status === "cancelled" ||
              appointment.status === "denied";
            const canCancel =
              !isCancelled && appointment.status !== "completed";
            const showPrimaryAction = canCancel || isCancelled;
            const isActionPending =
              isProcessingAction &&
              actionRequest?.appointment._id === appointment._id;

            return (
              <Card key={appointment._id}>
                <CardHeader>
                  <div className="flex flex-row items-center justify-between">
                    <div className="flex flex-col items-start justify-center">
                      <CardTitle className="text-base">
                        {barbershop?.name ?? "Barbería sin nombre"}
                      </CardTitle>
                      <CardDescription>
                        {new Date(appointment.date).toLocaleDateString(
                          "es-CO",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </CardDescription>
                    </div>

                    <Badge
                      variant={getAppointmentStatusBadgeVariant(
                        appointment.status,
                      )}
                    >
                      {getAppointmentStatusLabel(appointment.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardFooter className="gap-4">
                  <RescheduleRequestDialog
                    to="barber"
                    appointment={appointment}
                    trigger={
                      <Button
                        disabled={
                          appointment.status === "completed" || isCancelled
                        }
                      >
                        Reagendar
                      </Button>
                    }
                  />

                  {showPrimaryAction ? (
                    <Button
                      variant="destructive"
                      disabled={isActionPending || !showPrimaryAction}
                      onClick={() => {
                        if (isCancelled) {
                          setActionRequest({ appointment, type: "delete" });
                          return;
                        }

                        if (!cancelledByUserId) {
                          toast.error(
                            "Debes iniciar sesión para cancelar la cita.",
                          );
                          return;
                        }

                        setActionRequest({ appointment, type: "cancel" });
                      }}
                    >
                      {isActionPending ? (
                        <>
                          <Spinner className="mr-2 size-4" />
                          {isCancelled ? "Borrando..." : "Cancelando..."}
                        </>
                      ) : isCancelled ? (
                        "Borrar cita"
                      ) : (
                        "Cancelar cita"
                      )}
                    </Button>
                  ) : null}

                  {appointment.proposedDate ? (
                    <Button
                      variant="link"
                      disabled={appointment.status === "completed"}
                      className="text-muted-foreground"
                      asChild
                    >
                      <Link
                        to="/profile/appointments/reschedule/$appointmentId"
                        params={{ appointmentId: appointment._id }}
                      >
                        Ver solicitud
                      </Link>
                    </Button>
                  ) : null}
                </CardFooter>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center">
            <CalendarIcon className="size-6" />
            <p className="text-center text-muted-foreground text-xs md:text-sm">
              Aún no hay citas agendadas.
            </p>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!actionRequest}
        onOpenChange={(open) => {
          if (!open && !isProcessingAction) {
            setActionRequest(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTexts?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {dialogTexts?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessingAction}>
              No, volver
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleConfirmAction}
                disabled={isProcessingAction}
              >
                {isProcessingAction && <Spinner className="mr-2 size-4" />}
                {dialogTexts?.confirmLabel ?? "Confirmar"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
