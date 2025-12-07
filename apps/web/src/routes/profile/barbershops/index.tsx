/** biome-ignore-all lint/style/noNonNullAssertion: Needed */

import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { Activity, Suspense } from "react";

import { InviteBarberDialog } from "@/components/barbers/invite-barber-dialog";
import { barbersTableColumns } from "@/components/barbers/table/columns";
import { ServiceDialog } from "@/components/barbershops/services/service-dialog";
import { servicesTableColumns } from "@/components/barbershops/services/table/columns";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { DataTable } from "@/components/table/data-table";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  barbershopByOwnerIdQueryOptions,
  useBarbershopByOwnerId,
} from "@/hooks/barbershop/use-barbershop";
import {
  barbersByBarbershopIdQueryOptions,
  useBarbersByBarbershopId,
} from "@/hooks/use-barbershop-members";
import { profileQueryOptions } from "@/hooks/use-profile";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/profile/barbershops/")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
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
  const { data: barbers, isLoading: isLoadingBarbers } =
    useBarbersByBarbershopId(barbershop?._id!);
  const { data: services, isLoading: isLoadingServices } =
    useServicesFromBarbershop(barbershop?._id!);

  return (
    <BorderContainer className="space-y-6">
      <section className="flex w-full flex-col justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="font-bold text-xl tracking-tight">Servicios</h1>

          <Suspense fallback={<Skeleton className="h-9 w-24" />}>
            <Activity
              mode={
                !isLoadingServices && barbershop?._id ? "visible" : "hidden"
              }
            >
              <ServiceDialog
                barbershopId={barbershop?._id!}
                trigger={
                  <Button variant="outline">
                    <PlusIcon className="size-3" />
                    Agregar servicio
                  </Button>
                }
              />
            </Activity>
          </Suspense>
        </div>

        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <Activity
            mode={!isLoadingServices && services?.length ? "visible" : "hidden"}
          >
            <DataTable
              className="max-h-64"
              columns={servicesTableColumns}
              data={services}
            />
          </Activity>
        </Suspense>

        {services?.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                No hay servicios disponibles para esta barbería.
              </EmptyTitle>
              <EmptyDescription>
                Cuando agregues un servicio, podrás verlo aquí.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>

      <section className="flex w-full flex-col justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="font-bold text-xl tracking-tight">Barberos</h1>

          <Suspense fallback={<Skeleton className="h-9 w-24" />}>
            <Activity
              mode={!isLoadingBarbers && barbershop?._id ? "visible" : "hidden"}
            >
              <InviteBarberDialog barbershopId={barbershop?._id!} />
            </Activity>
          </Suspense>
        </div>

        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <Activity mode={barbers?.length ? "visible" : "hidden"}>
            <DataTable
              className="max-h-64"
              columns={barbersTableColumns}
              data={barbers?.length ? barbers : []}
            />
          </Activity>
        </Suspense>

        {barbers.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>
                No hay barberos asociados a esta barbería.
              </EmptyTitle>
              <EmptyDescription>
                Cuando invites a un barbero, podrás verlo aquí.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </BorderContainer>
  );
}
