/* oxlint-disable typescript/no-non-null-assertion -- barbershop is primed by the loader */

import { PlusIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { noop } from "@tanstack/react-query";
import { Suspense } from "react";
import { z } from "zod";

import {
  AppointmentsCalendar,
  CALENDAR_VIEWS,
  getCalendarDayTimestamp,
  getRangeDayTimestamps,
} from "@/calendar";
import { rescheduledAppointmentRequestsTableColumns } from "@/components/appointments/table/columns";
import {
  DashboardPage,
  DashboardPageActions,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import {
  DataTable,
  DataTableContent,
  DataTableSkeleton,
} from "@/components/table/data-table";
import { DataTablePagination } from "@/components/table/data-table-pagination";
import { useDataTable } from "@/components/table/use-data-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import {
  barbershopAvailabilityQueryOptions,
  useBarbershopAvailability,
  useBarbershopByMemberUserId,
} from "@/hooks/barbershop/use-barbershop";
import {
  getBarbershopPlanQueryOptions,
  useBarbershopPlan,
} from "@/hooks/billing/use-plan";
import {
  appointmentsByBarbershopQueryOptions,
  requestRescheduleQueryOptions,
  useRescheduledAppointmentRequests,
} from "@/hooks/use-appointments";
import {
  barberByUserIdQueryOptions,
  barbershopMembersByBarbershopIdQueryOptions,
  isBarberQueryOptions,
  isOwnerQueryOptions,
  isStaffQueryOptions,
  servicesForBarberQueryOptions,
  useBarberByUserId,
  useBarbershopMembersByBarbershopId,
  useIsBarber,
  useIsOwner,
  useIsStaff,
} from "@/hooks/use-barbershop-members";
import {
  serviceByAppointmentIdQueryOptions,
  servicesQueryOptions,
  useServicesByBarbershopId,
} from "@/hooks/use-services";
import { useSession } from "@/hooks/use-session";

const searchSchema = z.object({
  date: z
    .number()
    .optional()
    .default(() => Date.now())
    .transform((value) => getCalendarDayTimestamp(new Date(value))),
  view: z.enum(CALENDAR_VIEWS).optional().default("week"),
});

const RESCHEDULE_EMPTY = (
  <p className="text-muted-foreground text-sm">
    No hay solicitudes de reagendamiento.
  </p>
);

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/appointments/",
)({
  component: RouteComponent,
  pendingComponent: AppointmentsPending,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  ssr: "data-only",
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async ({ context, deps }) => {
    const userId = context.userId;

    if (!userId) return;

    const barbershop = context.dashboardBarbershop;

    if (!barbershop?._id) return;
    const barbershopId = barbershop._id;

    // Page spine: everything the route reads via useSuspenseQuery must resolve
    // before render (plan, members, services, availability, reschedule list).
    const spinePromise = Promise.all([
      context.queryClient.query({
        ...getBarbershopPlanQueryOptions(barbershopId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...barberByUserIdQueryOptions(userId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...isBarberQueryOptions(userId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...isStaffQueryOptions(userId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...isOwnerQueryOptions(userId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...barbershopAvailabilityQueryOptions(barbershopId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...servicesQueryOptions(barbershopId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...barbershopMembersByBarbershopIdQueryOptions(barbershopId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...requestRescheduleQueryOptions(barbershopId),
        staleTime: "static",
      }),
    ]).then((results) => [results[7], results[8]] as const);

    // Calendar range: one day-windowed query per visible day, matching
    // useCalendarAppointments' fan-out so the grid paints without pop-in.
    const rangePromise = Promise.all(
      getRangeDayTimestamps(deps.view, new Date(deps.date)).map((ms) =>
        context.queryClient.query({
          ...appointmentsByBarbershopQueryOptions({
            id: barbershopId,
            date: ms,
          }),
          staleTime: "static",
        }),
      ),
    );

    const [barbershopMembers, rescheduleRequests] = await Promise.all([
      spinePromise,
      rangePromise,
    ]).then(([spine]) => spine);

    // Leaf drill-downs primed without blocking: the create dialog's per-barber
    // services and the reschedule table's async service cells.
    for (const member of barbershopMembers) {
      void context.queryClient
        .query(servicesForBarberQueryOptions(member._id))
        .catch(noop);
    }
    for (const request of rescheduleRequests) {
      void context.queryClient
        .query(serviceByAppointmentIdQueryOptions(request._id))
        .catch(noop);
    }
  },
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const { date, view } = Route.useSearch();

  const { data: session } = useSession();
  const { data: barbershop } = useBarbershopByMemberUserId(session?.id ?? "");
  const { data: barbershopMembers } = useBarbershopMembersByBarbershopId(
    barbershop?._id!,
  );
  const { data: services } = useServicesByBarbershopId(barbershop?._id!);
  const { data: availability } = useBarbershopAvailability(barbershop?._id!);
  const { data: rescheduledAppointmentRequests } =
    useRescheduledAppointmentRequests(barbershop?._id!);
  const { canCreateStaffAppointments } = useBarbershopPlan(barbershop?._id!);
  const { data: isBarber } = useIsBarber(session?.id ?? "");
  const { data: isStaff } = useIsStaff(session?.id ?? "");
  const { data: isOwner } = useIsOwner(session?.id ?? "");
  const { data: currentBarberMember } = useBarberByUserId(session?.id ?? "");

  const canManage = isStaff || isOwner;
  const canCreate =
    canCreateStaffAppointments && (isBarber || isStaff || isOwner);

  // Barbers without a management role only handle their own appointments, so
  // they only see their own reschedule requests.
  const visibleRescheduleRequests =
    isBarber && !canManage
      ? rescheduledAppointmentRequests.filter(
          (request) => request.barbershopMemberId === currentBarberMember?._id,
        )
      : rescheduledAppointmentRequests;

  const rescheduleTable = useDataTable({
    data: visibleRescheduleRequests,
    columns: rescheduledAppointmentRequestsTableColumns,
    pageSize: 10,
  });

  return (
    <DashboardPage className="min-w-0 max-w-full">
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Citas"
          description="Administra tus citas y solicitudes de reagendamiento."
        />

        {canCreate && (
          <DashboardPageActions>
            <Button
              nativeButton={false}
              render={<Link to="/profile/barbershops/appointments/new" />}
            >
              <PlusIcon />
              Crear cita
            </Button>
          </DashboardPageActions>
        )}
      </DashboardPageHeader>

      <DashboardPageContent className="max-w-full space-y-8">
        <AppointmentsCalendar
          barbershopId={barbershop?._id!}
          services={services}
          barbers={barbershopMembers}
          availability={availability}
          view={view}
          date={new Date(date)}
          isBarber={isBarber ?? false}
          canManage={canManage}
          canCreate={canCreate}
          onCreateAppointment={(nextDate) => {
            void navigate({
              to: "/profile/barbershops/appointments/new",
              search: { date: nextDate.getTime() },
            });
          }}
          onViewChange={(next) => {
            void navigate({ search: (prev) => ({ ...prev, view: next }) });
          }}
          onDateChange={(next) => {
            void navigate({
              search: (prev) => ({ ...prev, date: next.getTime() }),
            });
          }}
        />

        <section className="min-w-0 max-w-full space-y-3">
          <header className="space-y-1">
            <h2 className="font-semibold text-lg">
              Solicitudes de reagendamiento
            </h2>
            <p className="text-pretty text-muted-foreground text-sm">
              Administra las solicitudes de reagendamiento pendientes. Recuerda
              que solo se puede reagendar el servicio una vez por usuario cada
              30 minutos.
            </p>
          </header>

          <Suspense fallback={<DataTableSkeleton columns={5} rows={4} />}>
            <DataTable table={rescheduleTable}>
              <DataTableContent empty={RESCHEDULE_EMPTY} />
              <DataTablePagination />
            </DataTable>
          </Suspense>
        </section>
      </DashboardPageContent>
    </DashboardPage>
  );
}

/** Pending frame: heading → calendar toolbar + grid → reschedule table. */
function AppointmentsPending() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-[70vh] max-h-[56rem] min-h-[32rem] w-full rounded-xl" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-64" />
        <DataTableSkeleton columns={5} rows={4} />
      </div>
    </div>
  );
}
