/** biome-ignore-all lint/style/noNonNullAssertion: needed */
import type { Appointment } from "@panabarbero/convex/schemas";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  appointmentByIdQueryOptions,
  useAppointmentActions,
  useAppointmentById,
} from "@/hooks/use-appointments";
import {
  barberByUserIdQueryOptions,
  isBarberQueryOptions,
  useIsBarber,
} from "@/hooks/use-barbershop-members";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";
import { getConvexErrorMessage } from "@/lib/convex-errors";

export const Route = createFileRoute(
  "/profile/appointments/reschedule/$appointmentId",
)({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  loader: async ({ context, params }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      const isBarber = await context.queryClient.ensureQueryData(
        isBarberQueryOptions(user?.userId!),
      );

      const redirectTo = isBarber
        ? "/profile/barbershops/appointments"
        : "/profile";

      const barber = await context.queryClient.ensureQueryData(
        barberByUserIdQueryOptions(user.userId),
      );

      const appointment = await context.queryClient.ensureQueryData(
        appointmentByIdQueryOptions(params.appointmentId as Appointment["_id"]),
      );

      const isBarberForAppointment =
        isBarber && barber?._id === appointment?.barbershopMemberId;
      const isCustomerForAppointment =
        !isBarber && appointment?.userId === user.userId;

      if (
        appointment?.status === "cancelled" ||
        appointment?.status === "completed" ||
        !isBarberForAppointment ||
        !isCustomerForAppointment
      ) {
        throw redirect({
          to: redirectTo,
          replace: true,
          search: { tab: isBarber ? "appointments" : "account" },
        });
      }
    } else {
      throw redirect({ to: "/login", replace: true });
    }
  },
});

function RouteComponent() {
  const { appointmentId } = Route.useParams();
  const router = useRouter();

  const { data: appointment } = useAppointmentById(
    appointmentId as Appointment["_id"],
  );

  const { data: session } = useSession();
  const { data: isBarber } = useIsBarber(session?.userId!);
  const {
    answerRescheduleRequest: {
      mutateAsync: answerReschedule,
      isPending: isAnswering,
      isSuccess: isAnsweringSuccess,
    },
  } = useAppointmentActions();

  const isCustomer = session?.userId === appointment?.userId && !isBarber;

  const isBarberForAppointment = isBarber && appointment?.barbershopMemberId;
  const hasPendingProposal = !!appointment?.proposedDate;
  const appointmentWithRequester = appointment as Appointment & {
    rescheduleRequestedByUserId?: string | null;
  };
  const requesterUserId = appointmentWithRequester?.rescheduleRequestedByUserId;
  const isRequester = requesterUserId === session?.userId;
  const canView =
    isCustomer ||
    isBarberForAppointment ||
    appointment?.status === "denied" ||
    appointment?.status === "cancelled";

  useEffect(() => {
    if (isAnsweringSuccess) {
      toast.success("Has respondido a la solicitud de reagendamiento.");
    }
  }, [isAnsweringSuccess]);

  const appointmentInfo = [
    {
      label: "Fecha original",
      value: new Date(appointment?.date!).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    {
      label: "Nueva fecha propuesta",
      value: new Date(appointment?.proposedDate!).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    {
      label: "Cliente",
      value: appointment?.customerName,
    },
    {
      label: "Correo de contacto",
      value: appointment?.contactEmail,
    },
    {
      label: "Teléfono de contacto",
      value: appointment?.contactPhone,
    },
  ];

  const handleAnswer = async (accepted: boolean) => {
    try {
      await answerReschedule({
        appointmentId: appointment?._id!,
        accepted,
        answeredBy: isBarber ? "barber" : "customer",
      });

      router.history.back();
    } catch (error) {
      toast.error(getConvexErrorMessage(error));
      return;
    }
  };

  const canRespond =
    hasPendingProposal && !!requesterUserId && canView && !isRequester;

  return (
    <BorderContainer className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
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
            {appointment?.notes?.trim()
              ? appointment?.notes
              : "No hay notas adicionales para esta solicitud."}
          </p>
        </div>
      </div>

      {canRespond ? (
        <section className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.history.back()}>
            Volver
          </Button>
          <Button
            variant="destructive"
            disabled={isAnswering}
            onClick={() => handleAnswer(false)}
          >
            Rechazar
          </Button>
          <Button disabled={isAnswering} onClick={() => handleAnswer(true)}>
            Aceptar
          </Button>
        </section>
      ) : (
        <Alert variant="primary" className="max-w-xl">
          <AlertTitle>Solicitud enviada</AlertTitle>
          <AlertDescription>
            Espera la respuesta de tu {isBarber ? "cliente" : "barbero"}.
          </AlertDescription>
        </Alert>
      )}
    </BorderContainer>
  );
}
