import type { Barbershop } from "@panabarbero/convex/schemas";
import { createFileRoute } from "@tanstack/react-router";

import { appointmentsTableColumns } from "@/components/appointments/table/columns";
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
import { useBarbersByBarbershopId } from "@/hooks/use-barbers";
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
    }
  },
});

function RouteComponent() {
  const { barbershopId } = Route.useSearch();

  const { data: user } = useSession();

  const { data: barbershops, isLoading: isLoadingBarbershops } =
    useBarbershopsByOwnerId(user?.userId ?? "");

  const { data: appointments, isLoading: isLoadingAppointments } =
    // biome-ignore lint/style/noNonNullAssertion: needed
    useAppointmentsByBarbershop(barbershopId ?? barbershops?.[0]?._id!);
  const { data: barbers, isLoading: isLoadingBarbers } =
    // biome-ignore lint/style/noNonNullAssertion: needed
    useBarbersByBarbershopId(barbershopId ?? barbershops?.[0]?._id!);

  return (
    <BorderContainer className="space-y-6">
      <section className="flex w-full flex-col justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="font-bold text-3xl tracking-tight">Citas</h1>

          <BarbershopsDropdown
            barbershops={barbershops ?? []}
            isLoading={isLoadingBarbershops}
          />
        </div>

        {isLoadingAppointments ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <DataTable
            className="max-h-64"
            columns={appointmentsTableColumns}
            data={appointments ?? []}
          />
        )}
      </section>

      <section className="flex w-full flex-col justify-between gap-4">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">Barberos</h1>
        </div>

        {isLoadingBarbers ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <DataTable
            className="max-h-64"
            columns={barbersTableColumns}
            data={barbers ?? []}
          />
        )}
      </section>
    </BorderContainer>
  );
}
