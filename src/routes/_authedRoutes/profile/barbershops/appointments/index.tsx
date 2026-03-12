/** biome-ignore-all lint/style/noNonNullAssertion: needed */

import { PlusIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { es } from "date-fns/locale";
import { lazy, Suspense } from "react";
import { z } from "zod";

import {
  getAppointmentsTableColumns,
  rescheduledAppointmentRequestsTableColumns,
} from "@/components/appointments/table/columns";
import { DashboardHeaderSkeleton } from "@/components/barbershops/dashboard-header.skeleton";
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
  servicesForBarberQueryOptions,
  useBarbershopMembersByBarbershopId,
  useIsBarber,
} from "@/hooks/use-barbershop-members";
import {
  serviceByAppointmentIdQueryOptions,
  servicesByIdsQueryOptions,
  useServicesByBarbershopId,
} from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

const DashboardHeader = lazy(() =>
  import("@/components/barbershops/dashboard-header").then((module) => ({
    default: module.DashboardHeader,
  })),
);

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

const dateSchema = z.object({
  date: z
    .number()
    .optional()
    .default(Date.now())
    .transform((val) => {
      const startOfDay = new Date(val);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      return startOfDay.getTime();
    }),
});

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/appointments/",
)({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  validateSearch: dateSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
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
          appointmentsByBarbershopQueryOptions({
            id: barbershop._id,
            date: deps.date,
          }),
        );
        const barbershopMembers = await context.queryClient.ensureQueryData(
          barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
        );

        if (barbershopMembers.length) {
          await Promise.all(
            barbershopMembers.map((barbershopMember) =>
              context.queryClient.ensureQueryData(
                servicesForBarberQueryOptions(barbershopMember._id),
              ),
            ),
          );
        }

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
            const servicesForBarbers = services.filter(
              (service) => service !== null,
            );

            await Promise.all(
              servicesForBarbers.map((service) =>
                context.queryClient.ensureQueryData(
                  barbersForServiceQueryOptions(service._id),
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
  const navigate = Route.useNavigate();
  const { date } = Route.useSearch();

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
  const { data: appointments } = useAppointmentsByBarbershop({
    id: barbershop?._id!,
    date,
  });
  const { canCreateStaffAppointments } = useBarbershopPlan(barbershop?._id!);
  const { data: isBarber } = useIsBarber(session?.userId!);

  const isOwner = session?.userId
    ? barbershop?.ownerId === session.userId
    : false;

  return (
    <BorderContainer className="space-y-4">
      <Suspense fallback={<DashboardHeaderSkeleton />}>
        <DashboardHeader
          title="Citas"
          description="Administra tus citas y solicitudes de reagendamiento."
        />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <h2 className="font-semibold text-lg">Selecciona un día</h2>
          <Calendar
            mode="single"
            selected={date ? new Date(date) : new Date()}
            onSelect={(date) => {
              if (!date) return;

              const startOfDay = new Date(date);
              startOfDay.setHours(0, 0, 0, 0);
              const endOfDay = new Date(startOfDay);
              endOfDay.setHours(23, 59, 59, 999);

              navigate({
                search: { date: startOfDay.getTime() },
              });
            }}
            locale={es}
            className="mx-auto rounded-lg border border-border [--cell-size:--spacing(11)] md:col-span-1 md:ml-auto md:[--cell-size:--spacing(7)] lg:[--cell-size:--spacing(9)] xl:[--cell-size:--spacing(12)]"
          />
        </div>

        <div className="md:col-span-2">
          <header className="mb-2 flex items-center justify-between gap-1">
            <h2 className="font-semibold text-lg">
              {date
                ? `${appointments.length} cita${appointments.length > 1 || appointments.length === 0 ? "s" : ""} (${new Date(
                    date,
                  ).toLocaleDateString("es-CO", {
                    month: "long",
                    day: "numeric",
                  })})`
                : "No hay día seleccionado"}
            </h2>

            {barbershop?._id && canCreateStaffAppointments && isBarber && (
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
              data={appointments}
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
