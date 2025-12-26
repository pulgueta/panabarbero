/** biome-ignore-all lint/style/noNonNullAssertion: needed */

import { createFileRoute } from "@tanstack/react-router";
import { es } from "date-fns/locale";
import { PlusIcon } from "lucide-react";
import { Activity, Suspense, useState } from "react";

import { CreateAppointmentDialog } from "@/components/appointments/create-appointment-dialog";
import {
  appointmentsTableColumns,
  rescheduledAppointmentRequestsTableColumns,
} from "@/components/appointments/table/columns";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { DataTable } from "@/components/table/data-table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
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
  barbershopMembersByBarbershopIdQueryOptions,
  isBarberQueryOptions,
  useBarbershopMembersByBarbershopId,
} from "@/hooks/use-barbershop-members";
import {
  serviceByAppointmentIdQueryOptions,
  servicesByIdsQueryOptions,
  useServicesByBarbershopId,
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
          barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
        );

        await context.queryClient.ensureQueryData(
          requestRescheduleQueryOptions(barbershop._id),
        );

        if (appointments) {
          await context.queryClient.ensureQueryData(
            servicesByIdsQueryOptions(
              appointments.map((appointment) => appointment.serviceId),
            ),
          );
          await Promise.all(
            appointments.map((appointment) =>
              context.queryClient.ensureQueryData(
                serviceByAppointmentIdQueryOptions(appointment._id),
              ),
            ),
          );
        }
      }
    }
  },
});

function RouteComponent() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );

  const { data: session } = useSession();
  const { data: barbershop } = useBarbershopByOwnerId(session?.userId!);
  const { data: barbershopMembers } = useBarbershopMembersByBarbershopId(
    barbershop?._id!,
  );
  const { data: services } = useServicesByBarbershopId(barbershop?._id!);
  const {
    data: rescheduledAppointmentRequests,
    isLoading: isLoadingRescheduledAppointmentRequests,
  } = useRescheduledAppointmentRequests(barbershop?._id!);
  const { data: appointments, isLoading: isLoadingAppointments } =
    useAppointmentsByBarbershop(barbershop?._id!);

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
    <BorderContainer className="space-y-4">
      <section className="flex w-full flex-col justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="font-bold text-2xl tracking-tight">Citas</h1>
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
            className="mx-auto rounded-lg border border-border [--cell-size:--spacing(11)] md:col-span-1 md:ml-auto md:[--cell-size:--spacing(7)] lg:[--cell-size:--spacing(9)] xl:[--cell-size:--spacing(12)]"
          />
        </div>

        <div className="md:col-span-2">
          <header className="mb-2 flex items-center justify-between gap-1">
            <h2 className="font-semibold text-lg">
              {selectedDate
                ? `${appointmentsForSelectedDay.length} cita${appointmentsForSelectedDay.length > 1 || appointmentsForSelectedDay.length === 0 ? "s" : ""} (${selectedDate.toLocaleDateString(
                    "es-CO",
                    {
                      month: "long",
                      day: "numeric",
                    },
                  )})`
                : "No hay día seleccionado"}
            </h2>

            {barbershop?._id && (
              <CreateAppointmentDialog
                trigger={
                  <Button>
                    <PlusIcon className="size-3" />
                    Crear cita
                  </Button>
                }
                barbershopId={barbershop._id}
                barbers={barbershopMembers}
                services={services}
                serviceId={undefined}
              />
            )}
          </header>

          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <Activity
              mode={
                !isLoadingAppointments && appointmentsForSelectedDay.length > 0
                  ? "visible"
                  : "hidden"
              }
            >
              <DataTable
                columns={appointmentsTableColumns}
                data={appointmentsForSelectedDay}
              />
            </Activity>
          </Suspense>

          {appointmentsForSelectedDay.length === 0 && (
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

        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <Activity
            mode={
              !isLoadingRescheduledAppointmentRequests &&
              rescheduledAppointmentRequests.length > 0
                ? "visible"
                : "hidden"
            }
          >
            <DataTable
              columns={rescheduledAppointmentRequestsTableColumns}
              data={rescheduledAppointmentRequests}
            />
          </Activity>
        </Suspense>

        {rescheduledAppointmentRequests.length === 0 && (
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
