/** biome-ignore-all lint/style/noNonNullAssertion: Needed */

import { PlusIcon } from "@phosphor-icons/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";

import { DashboardHeader } from "@/components/barbershops/dashboard-header";
import { ServiceCard } from "@/components/barbershops/services/service-card";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  barbershopByMemberUserIdQueryOptions,
  useBarbershopByMemberUserId,
} from "@/hooks/barbershop/use-barbershop";
import {
  barbershopMemberRolesQueryOptions,
  useBarbershopMemberRoles,
} from "@/hooks/barbershop/use-barbershop-member";
import { profileQueryOptions } from "@/hooks/use-profile";
import {
  servicesPaginatedByBarbershopIdQueryOptions,
  usePaginatedServicesFromBarbershop,
} from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

const ServiceDialog = lazy(() =>
  import("@/components/barbershops/services/service-dialog").then((module) => ({
    default: module.ServiceDialog,
  })),
);

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/services/",
)({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  loader: async (opts) => {
    const user = await opts.context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      const barbershop = await opts.context.queryClient.ensureQueryData(
        barbershopByMemberUserIdQueryOptions(user.userId),
      );

      const barbershopMemberRoles =
        await opts.context.queryClient.ensureQueryData(
          barbershopMemberRolesQueryOptions(user.userId),
        );

      if (!barbershopMemberRoles?.isOwner) {
        throw redirect({ to: "/profile/barbershops/appointments" });
      }

      await opts.context.queryClient.ensureQueryData(
        barbershopMemberRolesQueryOptions(user.userId),
      );

      await opts.context.queryClient.ensureQueryData(
        profileQueryOptions(user.userId),
      );

      if (barbershop?._id) {
        await opts.context.queryClient.ensureQueryData(
          servicesPaginatedByBarbershopIdQueryOptions(barbershop._id, null),
        );
      }
    }
  },
});

function RouteComponent() {
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([]);

  const pageSize = 6;

  const { data: user } = useSession();
  const { data: rolesData } = useBarbershopMemberRoles(user?.userId!);
  const { data: barbershop, isLoading: isLoadingBarbershop } =
    useBarbershopByMemberUserId(user?.userId!);
  const { data: servicesResult, isFetching: isFetchingServices } =
    usePaginatedServicesFromBarbershop(barbershop?._id!, cursor, pageSize);

  const services = servicesResult?.page;
  const hasNextPage =
    servicesResult?.continueCursor &&
    !servicesResult?.isDone &&
    services?.length &&
    services.length >= pageSize;
  const canGoPrevious = cursorStack.length > 0;

  return (
    <BorderContainer className="space-y-4">
      <section className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <DashboardHeader
            title="Servicios"
            description="Crea, edita y elimina los servicios que ofreces."
          />

          <Suspense fallback={<Skeleton className="h-9 w-full md:w-40" />}>
            {barbershop?._id && !isLoadingBarbershop && rolesData?.isOwner && (
              <ServiceDialog
                barbershopId={barbershop._id}
                trigger={
                  <Button variant="outline" disabled={!rolesData?.isOwner}>
                    <PlusIcon className="size-3" />
                    Agregar servicio
                  </Button>
                }
              />
            )}
          </Suspense>
        </div>

        <Suspense fallback={<ProfileTabSkeleton />}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services?.map((service) => (
              <ServiceCard
                key={service._id}
                service={service}
                isOwner={rolesData?.isOwner!}
              />
            ))}
          </div>

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
        </Suspense>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            disabled={isFetchingServices || !canGoPrevious}
            onClick={() => {
              setCursorStack((prev) => {
                const updated = [...prev];
                const previousCursor = updated.pop() ?? null;
                setCursor(previousCursor);
                return updated;
              });
            }}
          >
            Anterior
          </Button>
          <Button
            disabled={isFetchingServices || !hasNextPage}
            onClick={() => {
              setCursorStack((prev) => [...prev, cursor]);
              setCursor(servicesResult?.continueCursor ?? null);
            }}
          >
            Siguiente
          </Button>
        </div>
      </section>
    </BorderContainer>
  );
}
