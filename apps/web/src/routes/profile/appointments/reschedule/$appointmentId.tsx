import type { Appointment } from "@panabarbero/convex/schemas";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BorderContainer } from "@/components/layout/border-container";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Spinner } from "@/components/ui/spinner";
import {
  appointmentByIdQueryOptions,
  useAppointmentActions,
  useAppointmentById,
} from "@/hooks/use-appointments";
import { useBarberByUserId } from "@/hooks/use-barbers";
import { useSession } from "@/hooks/use-session";
import {
  getAppointmentStatusBadgeVariant,
  getAppointmentStatusLabel,
} from "@/lib/appointment-utils";

const formatDate = (timestamp?: number) => {
  if (!timestamp) return "Sin información";

  return format(new Date(timestamp), "PPPp", { locale: es });
};

export const Route = createFileRoute(
  "/profile/appointments/reschedule/$appointmentId",
)({
  loader: async ({ context, params }) => {
    const appointment = await context.queryClient.ensureQueryData(
      appointmentByIdQueryOptions(params.appointmentId as Appointment["_id"]),
    );

    if (!appointment) {
      throw new Error("Cita no encontrada");
    }

    return { appointmentId: appointment._id };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const { appointmentId } = Route.useLoaderData();
  const appointment = useAppointmentById(appointmentId);
  const { data: session } = useSession();
  const { data: barberRecord } = useBarberByUserId(session?.userId);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const {
    answerRescheduleRequest: {
      mutateAsync: answerReschedule,
      isPending: isResponding,
    },
    cancel: { mutateAsync: cancelAppointment, isPending: isCancelling },
  } = useAppointmentActions();

  const isCustomer = session?.userId === appointment?.userId;
  const isBarberForAppointment =
    barberRecord?._id && appointment?.barberId
      ? barberRecord._id === appointment.barberId
      : false;
  const hasPendingProposal = Boolean(appointment?.proposedDate);

  const appointmentInfo = useMemo(
    () => [
      {
        label: "Fecha original",
        value: formatDate(appointment?.date),
      },
      {
        label: "Nueva fecha propuesta",
        value: appointment?.proposedDate
          ? formatDate(appointment.proposedDate)
          : "Aún no se ha propuesto una fecha",
      },
      {
        label: "Cliente",
        value: appointment?.customerName ?? "Sin información",
      },
      {
        label: "Correo de contacto",
        value: appointment?.contactEmail ?? "Sin información",
      },
      {
        label: "Teléfono de contacto",
        value: appointment?.contactPhone ?? "Sin información",
      },
    ],
    [appointment],
  );

  const handleAnswer = async (accepted: boolean) => {
    if (!appointment) return;

    try {
      await answerReschedule({
        appointmentId: appointment._id,
        accepted,
      });
      toast.success(
        accepted
          ? "Has aceptado la solicitud de reagendamiento."
          : "Has rechazado la solicitud de reagendamiento.",
      );
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No pudimos actualizar la solicitud.",
      );
    }
  };

  const handleCancelAppointment = async () => {
    if (!appointment || !session?.userId) return;

    try {
      await cancelAppointment({
        appointmentId: appointment._id,
        cancelledByUserId: session.userId,
        reason:
          "El cliente canceló la cita tras la solicitud de reagendamiento.",
      });
      toast.success("La cita ha sido cancelada.");
      setIsCancelDialogOpen(false);
      router.invalidate();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No pudimos cancelar la cita. Intenta nuevamente.",
      );
    }
  };

  if (!appointment) {
    return null;
  }

  const canRespond = isBarberForAppointment && hasPendingProposal;

  return (
    <BorderContainer className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">Solicitud de reagendamiento</h1>
          <p className="text-muted-foreground text-sm">
            Revisa los detalles y responde a la solicitud.
          </p>
        </div>
        <Badge variant={getAppointmentStatusBadgeVariant(appointment.status)}>
          {getAppointmentStatusLabel(appointment.status)}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold text-lg">Detalles de la cita</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {appointmentInfo.map((item) => (
              <div key={item.label} className="flex flex-col">
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="font-semibold text-lg">Notas</h2>
          <p className="mt-4 text-sm text-muted-foreground">
            {appointment.notes?.trim()
              ? appointment.notes
              : "No hay notas adicionales para esta solicitud."}
          </p>
        </div>
      </div>

      {!hasPendingProposal ? (
        <Alert variant="warning">
          <AlertTitle>No hay solicitud activa</AlertTitle>
          <AlertDescription>
            La cita no cuenta con una fecha propuesta para reagendamiento. Pide
            a tu cliente que envíe una nueva solicitud si aún desea reagendar.
          </AlertDescription>
        </Alert>
      ) : null}

      {canRespond ? (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={isResponding}
            onClick={() => handleAnswer(false)}
          >
            {isResponding ? <Spinner /> : "Rechazar"}
          </Button>
          <Button disabled={isResponding} onClick={() => handleAnswer(true)}>
            {isResponding ? <Spinner /> : "Aceptar nueva fecha"}
          </Button>
        </div>
      ) : null}

      {isCustomer ? (
        <>
          <Alert>
            <AlertTitle>¿Deseas cancelar la cita?</AlertTitle>
            <AlertDescription>
              Si ya no puedes asistir, cancela la cita para liberar el espacio
              en la agenda de tu barbero.
            </AlertDescription>
          </Alert>
          <Button
            variant="destructive"
            onClick={() => setIsCancelDialogOpen(true)}
            disabled={isCancelling}
          >
            Cancelar cita
          </Button>
        </>
      ) : null}

      {!isCustomer && !canRespond ? (
        <Alert variant="destructive">
          <AlertTitle>No tienes acciones disponibles</AlertTitle>
          <AlertDescription>
            Solo el barbero asignado o el cliente que creó la cita pueden
            responder o cancelar esta solicitud.
          </AlertDescription>
        </Alert>
      ) : null}

      <AlertDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar cita</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cancelará la cita de forma definitiva y notificará al
              barbero. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Seguir esperando</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleCancelAppointment}
                disabled={isCancelling}
              >
                {isCancelling ? <Spinner /> : "Sí, cancelar cita"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => router.history.back()}
          type="button"
        >
          Volver
        </Button>
      </div>
    </BorderContainer>
  );
}
