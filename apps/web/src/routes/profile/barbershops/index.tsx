import type { Barbershop } from "@panabarbero/convex/schemas";
import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "react";

import { appointmentsTableColumns } from "@/components/appointments/table/columns";
import { InviteBarberDialog } from "@/components/barbers/invite-barber-dialog";
import { barbersTableColumns } from "@/components/barbers/table/columns";
import { BarbershopsDropdown } from "@/components/barbershops/barbershops-dropdown";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { DataTable } from "@/components/table/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  appointmentsByBarbershopQueryOptions,
  useAppointmentsByBarbershop,
} from "@/hooks/use-appointments";
import {
  barbersByBarbershopIdQueryOptions,
  useBarbersByBarbershopId,
} from "@/hooks/use-barbers";
import { useBarbershopsByOwnerId } from "@/hooks/use-barbershop";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/profile/barbershops/")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  validateSearch: (search?: { barbershopId?: Barbershop["_id"] }) => {
    return {
      barbershopId: search?.barbershopId,
    };
  },
  loaderDeps: ({ search }) => ({
    barbershopId: search?.barbershopId,
  }),
  loader: async (opts) => {
    if (opts.deps.barbershopId) {
      await opts.context.queryClient.prefetchQuery(
        appointmentsByBarbershopQueryOptions(opts.deps.barbershopId),
      );
      await opts.context.queryClient.prefetchQuery(
        barbersByBarbershopIdQueryOptions(opts.deps.barbershopId),
      );
    }
  },
});

function RouteComponent() {
  const { barbershopId } = Route.useSearch();

  const { data: user } = useSession();

  const { data: barbershops, isLoading: isLoadingBarbershops } =
    useBarbershopsByOwnerId(user?.userId ?? "");

  // biome-ignore lint/style/noNonNullAssertion: required
  const barbershop = barbershopId ?? barbershops?.[0]?._id!;

  const { data: appointments, isLoading: isLoadingAppointments } =
    useAppointmentsByBarbershop(barbershop);
  const { data: barbers, isLoading: isLoadingBarbers } =
    useBarbersByBarbershopId(barbershop);

  return (
    <BorderContainer className="space-y-6">
      <section className="flex w-full flex-col justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="font-bold text-3xl tracking-tight">Citas</h1>

          <Activity mode={barbershops?.length ? "visible" : "hidden"}>
            <BarbershopsDropdown
              barbershops={barbershops?.length ? barbershops : []}
              isLoading={isLoadingBarbershops}
            />
          </Activity>
        </div>

        {isLoadingAppointments ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <Activity mode={appointments?.length ? "visible" : "hidden"}>
            <DataTable
              className="max-h-64"
              columns={appointmentsTableColumns}
              data={appointments?.length ? appointments : []}
            />
          </Activity>
        )}
      </section>

      <section className="flex w-full flex-col justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="font-bold text-3xl tracking-tight">Barberos</h1>

          <InviteBarberDialog barbershopId={barbershop} />
        </div>

        {isLoadingBarbers ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <Activity mode={barbers?.length ? "visible" : "hidden"}>
            <DataTable
              className="max-h-64"
              columns={barbersTableColumns}
              data={barbers?.length ? barbers : []}
            />
          </Activity>
        )}
      </section>
    </BorderContainer>
  );
}
