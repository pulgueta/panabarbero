/** biome-ignore-all lint/style/noNonNullAssertion: needed */

import type { Appointment } from "@panabarbero/convex/schemas";
import { createFileRoute, Link } from "@tanstack/react-router";
import { es } from "date-fns/locale";
import {
  CalendarCheckIcon,
  CalendarClockIcon,
  EllipsisVerticalIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DeleteAppointmentDialog } from "@/components/appointments/delete-appointment-dialog";
import { RescheduleRequestDialog } from "@/components/appointments/reschedule-request-dialog";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
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
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  barbershopByOwnerIdQueryOptions,
  useBarbershopByOwnerId,
} from "@/hooks/barbershop/use-barbershop";
import {
  appointmentsByBarbershopQueryOptions,
  requestRescheduleQueryOptions,
  useAppointmentActions,
  useAppointmentsByBarbershop,
  useRescheduledAppointmentRequests,
} from "@/hooks/use-appointments";
import {
  servicesByIdsQueryOptions,
  useServicesByIds,
} from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";
import {
  getAppointmentStatusBadgeVariant,
  getAppointmentStatusLabel,
} from "@/lib/appointment-utils";

export const Route = createFileRoute("/profile/barbershops/appointments/")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      const barbershop = await context.queryClient.ensureQueryData(
        barbershopByOwnerIdQueryOptions(user.userId),
      );

      if (barbershop?._id) {
        const appointments = await context.queryClient.ensureQueryData(
          appointmentsByBarbershopQueryOptions(barbershop._id),
        );
        await context.queryClient.ensureQueryData(
          requestRescheduleQueryOptions(barbershop._id),
        );
        await context.queryClient.ensureQueryData(
          servicesByIdsQueryOptions(
            appointments.map((appointment) => appointment.serviceId),
          ),
        );
      }
    }
  },
});

function RouteComponent() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [isRescheduleOpen, setIsRescheduleOpen] = useState<boolean>(false);
  const [deleteReason, setDeleteReason] = useState<string>("");
  const [_, setDeleteError] = useState<string | null>(null);

  const {
    deleteAppointmentMutation: {
      mutateAsync: deleteAppointment,
      isPending: isDeletingAppointment,
    },
    cancelAppointmentMutation: {
      mutateAsync: cancelAppointment,
      isPending: isCancellingAppointment,
    },
    answerRescheduleRequest: {
      mutateAsync: answerRescheduleRequest,
      isPending: isAnsweringRescheduleRequest,
    },
  } = useAppointmentActions();
  const { data: session } = useSession();
  const { data: barbershop } = useBarbershopByOwnerId(session?.userId!);
  const { data: rescheduledAppointmentRequests } =
    useRescheduledAppointmentRequests(barbershop?._id!);
  const { data: appointments } = useAppointmentsByBarbershop(barbershop?._id!);
  const { data: services } = useServicesByIds(
    appointments.map((appointment) => appointment.serviceId),
  );

  const handleDelete = async (obj: {
    appointmentId: Appointment["_id"];
    isAlreadyCancelledOrDenied: boolean;
  }) => {
    const requiresReason = !obj.isAlreadyCancelledOrDenied;

    if (requiresReason && !deleteReason.trim()) {
      setDeleteError("Debes ingresar una razón para cancelar la cita.");
      return;
    }

    if (!session?.userId) {
      toast.error("Debes iniciar sesión para eliminar esta cita.");
      return;
    }

    const reason = deleteReason.trim();

    if (requiresReason) {
      await cancelAppointment({
        appointmentId: obj.appointmentId,
        cancelledByUserId: session.userId,
        reason,
      });
    }

    await deleteAppointment({ appointmentId: obj.appointmentId });

    toast.success("La cita fue cancelada y eliminada exitosamente.");

    setDeleteReason("");
    setDeleteError(null);
    resetDeleteState();
  };

  const appointmentsForSelectedDay = appointments
    .filter((appointment) => {
      const appointmentDate = new Date(appointment.date);
      return (
        appointmentDate.getFullYear() === selectedDate?.getFullYear() &&
        appointmentDate.getMonth() === selectedDate?.getMonth() &&
        appointmentDate.getDate() === selectedDate?.getDate()
      );
    })
    .sort((a, b) => a.date - b.date);

  const resetDeleteState = () => {
    setDeleteReason("");
    setDeleteError(null);
  };

  const [requestToReject, setRequestToReject] = useState<Appointment | null>(
    null,
  );
  const [requestRejectReason, setRequestRejectReason] = useState<string>("");
  const [requestRejectError, setRequestRejectError] = useState<string | null>(
    null,
  );
  const [requestInProgressId, setRequestInProgressId] = useState<
    Appointment["_id"] | null
  >(null);
  const [requestInProgressAction, setRequestInProgressAction] = useState<
    "accept" | "reject" | null
  >(null);

  const isHandlingRequest = useMemo(
    () => (id: Appointment["_id"], action?: "accept" | "reject") =>
      requestInProgressId === id &&
      (action ? requestInProgressAction === action : true),
    [requestInProgressAction, requestInProgressId],
  );

  const resetRequestProgress = () => {
    setRequestInProgressId(null);
    setRequestInProgressAction(null);
  };

  const handleRequestAnswer = async (
    requestId: Appointment["_id"],
    accepted: boolean,
    options?: { reason?: string },
  ) => {
    if (!session?.userId) {
      toast.error("Debes iniciar sesión para gestionar la solicitud.");
      return;
    }

    setRequestInProgressId(requestId);
    setRequestInProgressAction(accepted ? "accept" : "reject");
    try {
      await answerRescheduleRequest({
        appointmentId: requestId,
        accepted,
      });
      if (!accepted) {
        const reason = options?.reason?.trim();
        if (!reason) {
          throw new Error("Debes ingresar una razón válida.");
        }
        await cancelAppointment({
          appointmentId: requestId,
          cancelledByUserId: session.userId,
          reason,
        });
      }
      toast.success(
        accepted
          ? "Has aceptado la solicitud de reagendamiento."
          : "Has rechazado la solicitud y la cita fue cancelada.",
      );
    } catch (error) {
      console.error(error);
      toast.error(
        "No pudimos actualizar la solicitud. Intenta de nuevo en unos segundos.",
      );
    } finally {
      if (!accepted) {
        setRequestToReject(null);
        setRequestRejectReason("");
        setRequestRejectError(null);
      }
      resetRequestProgress();
    }
  };

  const handleRejectConfirmation = async () => {
    if (!requestToReject) return;
    const reason = requestRejectReason.trim();
    if (!reason) {
      setRequestRejectError("Debes ingresar una razón para cancelar la cita.");
      return;
    }

    await handleRequestAnswer(requestToReject._id, false, { reason });
  };

  return (
    <BorderContainer className="space-y-6">
      <section className="flex w-full flex-col justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="font-bold text-xl tracking-tight">Citas</h1>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <h2 className="font-semibold text-lg">Selecciona un día</h2>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={es}
            disabled={(date) =>
              date.getTime() < new Date().setHours(0, 0, 0, 0)
            }
            className="mx-auto rounded-lg border border-border [--cell-size:--spacing(12)] md:col-span-1 md:ml-auto md:[--cell-size:--spacing(6)] lg:[--cell-size:--spacing(8)] xl:[--cell-size:--spacing(12)]"
          />
        </div>

        <div className="md:col-span-2">
          <header className="mb-4 flex flex-col gap-1">
            <h2 className="font-semibold text-lg">
              Citas para:{" "}
              {selectedDate
                ? selectedDate.toLocaleDateString("es-CO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "la fecha seleccionada"}
            </h2>
            <p className="text-muted-foreground text-sm">
              {appointmentsForSelectedDay.length} cita(s) encontradas
            </p>
          </header>

          {appointmentsForSelectedDay.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Hora</TableHead>
                  <TableHead className="text-center">Cliente</TableHead>
                  <TableHead className="text-center">Servicio</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointmentsForSelectedDay.map((appointment) => {
                  const service = services?.find(
                    (service) => service?._id === appointment.serviceId,
                  );

                  const isCompleted = appointment.status === "completed";
                  const isCancelled = appointment.status === "cancelled";
                  const isConfirmed = appointment.status === "confirmed";
                  const isDenied = appointment.status === "denied";
                  const isAlreadyCancelledOrDenied = isCancelled || isDenied;
                  const canReschedule = !isCompleted && !isCancelled;
                  const showManageRescheduleLink =
                    !!appointment.proposedDate && !isConfirmed;

                  return (
                    <TableRow key={appointment._id}>
                      <TableCell className="text-center">
                        {new Date(appointment.date).toLocaleTimeString(
                          "es-CO",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {appointment.customerName}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {service?.name}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={getAppointmentStatusBadgeVariant(
                            appointment.status,
                          )}
                        >
                          {getAppointmentStatusLabel(appointment.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                              <EllipsisVerticalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="max-w-64">
                            <DropdownMenuItem
                              disabled={!canReschedule}
                              className="inline-flex w-full items-center gap-x-2"
                              onSelect={(event) => {
                                event.preventDefault();
                                if (!canReschedule) return;
                                setIsRescheduleOpen(true);
                              }}
                            >
                              <CalendarClockIcon className="size-3" />
                              Solicitar reagendamiento
                            </DropdownMenuItem>

                            {showManageRescheduleLink && (
                              <DropdownMenuItem asChild>
                                <Link
                                  to={
                                    "/profile/appointments/reschedule/$appointmentId"
                                  }
                                  params={{ appointmentId: appointment._id }}
                                  style={{
                                    viewTransitionName: `appointment-${appointment._id}-reschedule`,
                                  }}
                                  className="inline-flex w-full items-center gap-x-2"
                                >
                                  <CalendarCheckIcon className="size-3" />
                                  Gestionar reagendamiento
                                </Link>
                              </DropdownMenuItem>
                            )}

                            <DeleteAppointmentDialog
                              appointmentId={appointment._id}
                              handleDelete={handleDelete}
                              resetDeleteState={resetDeleteState}
                              isDeletingAppointment={isDeletingAppointment}
                              isCancellingAppointment={isCancellingAppointment}
                              isAlreadyCancelledOrDenied={
                                isAlreadyCancelledOrDenied
                              }
                            />
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <RescheduleRequestDialog
                          appointment={appointment}
                          to="customer"
                          disabled={!canReschedule}
                          open={isRescheduleOpen}
                          onOpenChange={setIsRescheduleOpen}
                          trigger={null}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Empty>
              <EmptyTitle>No hay citas para el día seleccionado.</EmptyTitle>
              <EmptyDescription>
                Selecciona un día para ver las citas agendadas para ese día.
              </EmptyDescription>
            </Empty>
          )}
        </div>
      </div>

      <div>
        <header className="mb-2 space-y-1">
          <h2 className="font-semibold text-lg">
            Solicitudes de reagendamiento
          </h2>

          <p className="text-pretty text-muted-foreground text-sm">
            Administra las solicitudes de reagendamiento pendientes. Recuerda
            que solo se puede reagendar el servicio una vez por usuario cada 30
            minutos.
          </p>
        </header>

        {rescheduledAppointmentRequests.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Cliente</TableHead>
                <TableHead className="text-center">Servicio</TableHead>
                <TableHead className="text-center">Fecha original</TableHead>
                <TableHead className="text-center">Fecha propuesta</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rescheduledAppointmentRequests.map((request) => {
                const service = services?.find(
                  (service) => service?._id === request.serviceId,
                );

                return (
                  <TableRow key={request._id}>
                    <TableCell className="text-center">
                      {request.customerName}
                    </TableCell>
                    <TableCell className="text-center">
                      {service?.name}
                    </TableCell>
                    <TableCell className="text-center">
                      {new Date(request.date).toLocaleDateString("es-CO", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-center">
                      {new Date(request.proposedDate!).toLocaleDateString(
                        "es-CO",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="mx-auto flex items-center justify-center gap-2">
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setRequestRejectReason("");
                            setRequestRejectError(null);
                            setRequestToReject(request);
                          }}
                          disabled={
                            isHandlingRequest(request._id) ||
                            isAnsweringRescheduleRequest
                          }
                        >
                          {isHandlingRequest(request._id, "reject") && (
                            <Spinner className="mr-2 size-4" />
                          )}
                          Rechazar y cancelar
                        </Button>
                        <Button
                          onClick={() => handleRequestAnswer(request._id, true)}
                          disabled={
                            isHandlingRequest(request._id) ||
                            isAnsweringRescheduleRequest
                          }
                        >
                          {isHandlingRequest(request._id, "accept") && (
                            <Spinner className="mr-2 size-4" />
                          )}
                          Aceptar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Empty>
            <EmptyTitle>
              No hay solicitudes de reagendamiento pendientes.
            </EmptyTitle>
            <EmptyDescription>
              Cuando un cliente solicita un reagendamiento, podrás gestionarlo
              aquí.
            </EmptyDescription>
          </Empty>
        )}
      </div>
      <AlertDialog
        open={!!requestToReject}
        onOpenChange={(open) => {
          if (!open) {
            setRequestToReject(null);
            setRequestRejectReason("");
            setRequestRejectError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar cita</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción rechazará la solicitud y cancelará la cita de{" "}
              {requestToReject?.customerName}. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-left">
            <Textarea
              value={requestRejectReason}
              onChange={(event) => {
                setRequestRejectReason(event.target.value);
                if (requestRejectError) {
                  setRequestRejectError(null);
                }
              }}
              placeholder="Explica por qué no puedes aceptar el reagendamiento."
            />
            {requestRejectError ? (
              <p className="text-destructive text-sm">{requestRejectError}</p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRequestToReject(null)}
              >
                No, conservar cita
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleRejectConfirmation}
                disabled={
                  !requestToReject ||
                  isHandlingRequest(requestToReject._id, "reject") ||
                  !requestRejectReason.trim()
                }
              >
                {requestToReject &&
                isHandlingRequest(requestToReject._id, "reject") ? (
                  <Spinner className="mr-2 size-4" />
                ) : null}
                Sí, cancelar cita
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BorderContainer>
  );
}
