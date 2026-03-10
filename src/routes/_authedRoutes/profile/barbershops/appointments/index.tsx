/** biome-ignore-all lint/style/noNonNullAssertion: needed */

import { PlusIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { es } from "date-fns/locale";
import { lazy, Suspense, useState } from "react";

import {
  getAppointmentsTableColumns,
  rescheduledAppointmentRequestsTableColumns,
} from "@/components/appointments/table/columns";
import { DashboardHeader } from "@/components/barbershops/dashboard-header";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  barbershopByMemberUserIdQueryOptions,
  useBarbershopByMemberUserId,
} from "@/hooks/barbershop/use-barbershop";
import {
  getBarbershopPlanQueryOptions,
  useBarbershopPlan,
} from "@/hooks/billing/use-plan";

import {
  appointmentsByBarbershopQueryOptions,
  requestRescheduleQueryOptions,
  useAppointmentsByBarbershop,
  useRescheduledAppointmentRequests,
} from "@/hooks/use-appointments";
import {
  barberByUserIdQueryOptions,
  barbersForServiceQueryOptions,
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

const DataTable = lazy(() =>
  import("@/components/table/data-table").then((module) => ({
    default: module.DataTable,
  })),
) as typeof import("@/components/table/data-table").DataTable;

const CreateAppointmentDialog = lazy(() =>
  import("@/components/appointments/create-appointment-dialog").then(
    (module) => ({
      default: module.CreateAppointmentDialog,
    }),
  ),
);

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/appointments/",
)({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      const barbershop = await context.queryClient.ensureQueryData(
        barbershopByMemberUserIdQueryOptions(user.userId),
      );

      await context.queryClient.ensureQueryData(
        isBarberQueryOptions(user.userId),
      );

      if (barbershop?._id) {
        await context.queryClient.ensureQueryData(
          getBarbershopPlanQueryOptions(barbershop._id),
        );

        const appointments = await context.queryClient.ensureQueryData(
          appointmentsByBarbershopQueryOptions(barbershop._id),
        );
        await context.queryClient.ensureQueryData(
          barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
        );
        await context.queryClient.ensureQueryData(
          barberByUserIdQueryOptions(user.userId),
        );

        await context.queryClient.ensureQueryData(
          requestRescheduleQueryOptions(barbershop._id),
        );

        if (appointments) {
          const services = await context.queryClient.ensureQueryData(
            servicesByIdsQueryOptions(
              appointments.map((appointment) => appointment.serviceId),
            ),
          );

          if (services) {
            await Promise.all(
              services.map((service) =>
                context.queryClient.ensureQueryData(
                  barbersForServiceQueryOptions(service?._id!),
                ),
              ),
            );
          }

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
  const { data: barbershop } = useBarbershopByMemberUserId(
    session?.userId ?? "",
  );
  const { data: barbershopMembers } = useBarbershopMembersByBarbershopId(
    barbershop?._id!,
  );
  const { data: services } = useServicesByBarbershopId(barbershop?._id!);
  const { data: rescheduledAppointmentRequests } =
    useRescheduledAppointmentRequests(barbershop?._id!);
  const { data: appointments } = useAppointmentsByBarbershop(barbershop?._id!);
  const { canCreateStaffAppointments } = useBarbershopPlan(barbershop?._id!);

  const isOwner = Boolean(
    session?.userId && barbershop?.ownerId === session.userId,
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
    <BorderContainer className="space-y-4">
      <DashboardHeader
        title="Citas"
        description="Administra tus citas y solicitudes de reagendamiento."
      />

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

            {barbershop?._id && canCreateStaffAppointments && (
              <Suspense
                fallback={
                  <Button disabled>
                    <PlusIcon />
                    Crear cita
                  </Button>
                }
              >
                <CreateAppointmentDialog
                  trigger={
                    <Button>
                      <PlusIcon />
                      Crear cita
                    </Button>
                  }
                  barbershopId={barbershop._id}
                  barbers={barbershopMembers}
                  services={services}
                  serviceId={undefined}
                />
              </Suspense>
            )}
          </header>

          <Suspense fallback={<Skeleton className="h-32 w-full md:h-64" />}>
            <DataTable
              columns={getAppointmentsTableColumns({ isOwner })}
              data={appointmentsForSelectedDay}
            />
          </Suspense>
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

        <Suspense fallback={<Skeleton className="h-32 w-full md:h-64" />}>
          <DataTable
            columns={rescheduledAppointmentRequestsTableColumns}
            data={rescheduledAppointmentRequests}
          />
        </Suspense>
      </div>
    </BorderContainer>
  );
}
