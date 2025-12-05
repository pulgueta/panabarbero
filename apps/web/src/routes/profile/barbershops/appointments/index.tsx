/** biome-ignore-all lint/style/noNonNullAssertion: needed */

import { createFileRoute, Link } from "@tanstack/react-router";
import { es } from "date-fns/locale";
import { useState } from "react";

import { AppointmentsForDateTable } from "@/components/appointments/table/appointments-for-date-table";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  barbershopByOwnerIdQueryOptions,
  useBarbershopByOwnerId,
} from "@/hooks/barbershop/use-barbershop";
import {
  appointmentsByBarbershopQueryOptions,
  requestRescheduleQueryOptions,
  useAppointmentsByBarbershop,
  useRescheduledAppointmentRequests,
} from "@/hooks/use-appointments";
import {
  isBarberQueryOptions,
  useIsBarber,
} from "@/hooks/use-barbershop-members";
import {
  servicesByIdsQueryOptions,
  useServicesByIds,
} from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

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

      await context.queryClient.ensureQueryData(
        isBarberQueryOptions(user.userId),
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

  const { data: session } = useSession();
  const { data: isBarber } = useIsBarber(session?.userId!);
  const { data: barbershop } = useBarbershopByOwnerId(session?.userId!);
  const { data: rescheduledAppointmentRequests } =
    useRescheduledAppointmentRequests(barbershop?._id!);
  const { data: appointments } = useAppointmentsByBarbershop(barbershop?._id!);
  const { data: services } = useServicesByIds(
    appointments.map((appointment) => appointment.serviceId),
  );

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
            className="mx-auto rounded-lg border border-border [--cell-size:--spacing(12)] md:col-span-1 md:ml-auto md:[--cell-size:--spacing(7)] lg:[--cell-size:--spacing(9)] xl:[--cell-size:--spacing(12)]"
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
            <AppointmentsForDateTable
              appointments={appointmentsForSelectedDay}
              // @ts-expect-error - services can be null
              services={services}
              isBarber={isBarber}
            />
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
                        <Button asChild variant="outline">
                          <Link
                            to={
                              "/profile/appointments/reschedule/$appointmentId"
                            }
                            params={{ appointmentId: request._id }}
                          >
                            Ver solicitud
                          </Link>
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
    </BorderContainer>
  );
}
