/** biome-ignore-all lint/style/noNonNullAssertion: Needed */

import { createFileRoute } from "@tanstack/react-router";
import { CalendarIcon, ScissorsIcon, UsersIcon } from "lucide-react";
import { Activity } from "react";

import { AppointmentDialog } from "@/components/appointments/appointment-dialog";
import { appointmentsTableColumns } from "@/components/appointments/table/columns";
import { InviteBarberDialog } from "@/components/barbers/invite-barber-dialog";
import { barbersTableColumns } from "@/components/barbers/table/columns";
import { ServiceDialog } from "@/components/barbershops/services/service-dialog";
import { servicesTableColumns } from "@/components/barbershops/services/table/columns";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { DataTable } from "@/components/table/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  barbershopByOwnerIdQueryOptions,
  useBarbershopByOwnerId,
} from "@/hooks/barbershop/use-barbershop";
import {
  appointmentsByBarbershopQueryOptions,
  useAppointmentsByBarbershop,
} from "@/hooks/use-appointments";
import {
  barbersByBarbershopIdQueryOptions,
  useBarbersByBarbershopId,
} from "@/hooks/use-barbers";
import { profileQueryOptions } from "@/hooks/use-profile";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/profile/barbershops/")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  beforeLoad: async ({ context }) => {
    await context.queryClient.prefetchQuery(getSessionQueryOptions());
  },
  loader: async (opts) => {
    const user = await opts.context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      const barbershop = await opts.context.queryClient.ensureQueryData(
        barbershopByOwnerIdQueryOptions(user.userId),
      );

      await opts.context.queryClient.ensureQueryData(
        profileQueryOptions(user.userId),
      );

      if (barbershop?._id) {
        await opts.context.queryClient.ensureQueryData(
          appointmentsByBarbershopQueryOptions(barbershop._id),
        );
        await opts.context.queryClient.ensureQueryData(
          barbersByBarbershopIdQueryOptions(barbershop._id),
        );
        await opts.context.queryClient.ensureQueryData(
          servicesQueryOptions(barbershop._id),
        );
        await opts.context.queryClient.ensureQueryData(
          servicesQueryOptions(barbershop._id),
        );
      }
    }
  },
});

function RouteComponent() {
  const { data: user } = useSession();

  const { data: barbershop } = useBarbershopByOwnerId(user?.userId!);
  const { data: appointments, isLoading: isLoadingAppointments } =
    useAppointmentsByBarbershop(barbershop?._id!);
  const { data: barbers, isLoading: isLoadingBarbers } =
    useBarbersByBarbershopId(barbershop?._id!);
  const { data: services, isLoading: isLoadingServices } =
    useServicesFromBarbershop(barbershop?._id!);

  return (
    <BorderContainer className="space-y-6">
      <section className="flex w-full flex-col justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="font-bold text-xl tracking-tight">Citas</h1>

          <AppointmentDialog service={services?.[0]!} />
        </div>

        {isLoadingAppointments ? (
          <Skeleton className="h-48 w-full" />
        ) : appointments?.length ? (
          <DataTable
            className="max-h-64"
            columns={appointmentsTableColumns}
            data={appointments}
          />
        ) : (
          <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center">
            <CalendarIcon className="size-6" />
            <p className="text-center text-muted-foreground text-xs md:text-sm">
              Aún no hay citas agendadas para esta barbería.
            </p>
          </div>
        )}
      </section>

      <section className="flex w-full flex-col justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="font-bold text-xl tracking-tight">Servicios</h1>

          <ServiceDialog barbershopId={barbershop?._id!} />
        </div>

        {isLoadingServices ? (
          <Skeleton className="h-48 w-full" />
        ) : services?.length ? (
          <DataTable
            className="max-h-64"
            columns={servicesTableColumns}
            data={services}
          />
        ) : (
          <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center">
            <ScissorsIcon className="size-6" />
            <p className="text-center text-muted-foreground text-xs md:text-sm">
              Aún no hay servicios disponibles para esta barbería.
            </p>
          </div>
        )}
      </section>

      <section className="flex w-full flex-col justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="font-bold text-xl tracking-tight">Barberos</h1>

          <InviteBarberDialog barbershopId={barbershop?._id!} />
        </div>

        {isLoadingBarbers ? (
          <Skeleton className="h-48 w-full" />
        ) : barbers?.length ? (
          <Activity mode={barbers?.length ? "visible" : "hidden"}>
            <DataTable
              className="max-h-64"
              columns={barbersTableColumns}
              data={barbers?.length ? barbers : []}
            />
          </Activity>
        ) : (
          <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center">
            <UsersIcon className="size-6" />
            <p className="text-center text-muted-foreground text-xs md:text-sm">
              Aún no hay barberos asociados a esta barbería.
            </p>
          </div>
        )}
      </section>
    </BorderContainer>
  );
}
