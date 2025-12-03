/** biome-ignore-all lint/style/noNonNullAssertion: needed */
import type { Appointment } from "@panabarbero/convex/schemas";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
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
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  appointmentByIdQueryOptions,
  useAppointmentActions,
  useAppointmentById,
} from "@/hooks/use-appointments";
import {
  barberByUserIdQueryOptions,
  useBarberByUserId,
  useIsBarber,
} from "@/hooks/use-barbers";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

const formatDate = (timestamp?: number) => {
  if (!timestamp) return "Sin información";

  return format(new Date(timestamp), "PPPp", { locale: es });
};

export const Route = createFileRoute(
  "/profile/appointments/reschedule/$appointmentId",
)({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  loader: async ({ context, params }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );
    await context.queryClient.ensureQueryData(
      appointmentByIdQueryOptions(params.appointmentId as Appointment["_id"]),
    );

    if (user?.userId) {
      await context.queryClient.ensureQueryData(
        barberByUserIdQueryOptions(user.userId),
      );
    }
  },
});

function RouteComponent() {
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState<boolean>(false);

  const navigate = Route.useNavigate();
  const { appointmentId } = Route.useParams();

  const { data: appointment } = useAppointmentById(
    appointmentId as Appointment["_id"],
  );

  const { data: session } = useSession();
  const { data: barberRecord } = useBarberByUserId(session?.userId!);
  const { data: isBarber } = useIsBarber(session?.userId!);
  const {
    answerRescheduleRequest: {
      mutateAsync: answerReschedule,
      isPending: isAnswering,
    },
    cancelAppointmentMutation: {
      mutateAsync: cancelAppointment,
      isPending: isCancellingAppointment,
    },
  } = useAppointmentActions();

  const isCustomer = session?.userId === appointment?.userId;
  const isBarberForAppointment =
    isBarber && appointment?.barberId === barberRecord?._id;
  const hasPendingProposal = !!appointment?.proposedDate;
  const requesterUserId = (
    appointment as Appointment & {
      rescheduleRequestedByUserId?: string | null;
    }
  )?.rescheduleRequestedByUserId;
  const isViewerRequester = requesterUserId === session?.userId;

  const redirectTo = isBarber ? "/profile/barbershops" : "/profile";

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

    await answerReschedule({
      appointmentId: appointment._id,
      accepted,
    });

    toast.success(
      accepted
        ? "Has aceptado la solicitud de reagendamiento."
        : "Has rechazado la solicitud de reagendamiento.",
    );

    navigate({ to: redirectTo });
  };

  const handleCancelAppointment = async () => {
    if (!appointment || !session?.userId) return;

    await cancelAppointment({
      appointmentId: appointment._id,
      cancelledByUserId: session.userId,
      reason: "El cliente canceló la cita tras la solicitud de reagendamiento.",
    });

    toast.success("La cita ha sido cancelada.");

    setIsCancelDialogOpen(false);

    navigate({ to: redirectTo });
  };

  if (!appointment) {
    return null;
  }

  let canRespond = false;
  if (hasPendingProposal && requesterUserId) {
    if (requesterUserId === appointment.userId) {
      // Customer requested, barber responds
      canRespond = isBarberForAppointment && !isViewerRequester;
    } else if (requesterUserId === barberRecord?.userId) {
      // Barber requested, customer responds
      canRespond = isCustomer && !isViewerRequester;
    } else {
      canRespond = (isCustomer || isBarberForAppointment) && !isViewerRequester;
    }
  }

  return (
    <BorderContainer className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl">Solicitud de reagendamiento</h1>
          <p className="text-muted-foreground text-sm">
            Revisa los detalles y responde a la solicitud.
          </p>
        </div>
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
          <p className="mt-4 text-muted-foreground text-sm">
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

      {isViewerRequester && hasPendingProposal ? (
        <Alert>
          <AlertTitle>Solicitud enviada</AlertTitle>
          <AlertDescription>
            Ya enviaste esta solicitud. Debes esperar a que la otra parte la
            acepte o rechace.
          </AlertDescription>
        </Alert>
      ) : null}

      {canRespond ? (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="destructive"
            disabled={isAnswering || isCancellingAppointment}
            onClick={() => handleAnswer(false)}
          >
            {isCancellingAppointment && <Spinner />} Rechazar y cancelar
          </Button>
          <Button
            disabled={isAnswering || isCancellingAppointment}
            onClick={() => handleAnswer(true)}
          >
            {isAnswering && <Spinner />} Aceptar nueva fecha
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
            disabled={isCancellingAppointment}
          >
            Cancelar cita
          </Button>
        </>
      ) : null}

      {!isCustomer && !canRespond && !isViewerRequester ? (
        <Alert variant="destructive">
          <AlertTitle>No tienes acciones disponibles</AlertTitle>
          <AlertDescription>
            Solo el receptor de la solicitud puede aceptarla o rechazarla.
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
                disabled={isCancellingAppointment}
              >
                {isCancellingAppointment ? <Spinner /> : "Sí, cancelar cita"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BorderContainer>
  );
}
