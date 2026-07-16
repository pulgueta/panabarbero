import type { Barbershop } from "@convex/schema";
import { PackageIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import type { FC } from "react";

import {
  DashboardPage,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { DashboardPending } from "@/components/dashboard/dashboard-pending";
import { MovementLedger } from "@/components/inventory/movements/movement-ledger";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import {
  getBarbershopPlanQueryOptions,
  useBarbershopPlan,
} from "@/hooks/billing/use-plan";
import { shopMovementsPaginatedQueryOptions } from "@/hooks/use-inventory";

const MOVEMENTS_DESCRIPTION =
  "El historial completo de movimientos de tu inventario.";

const LEDGER_PAGE_SIZE = 20;

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/inventory/movements/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Movimientos" },
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async (opts) => {
    const barbershop = opts.context.dashboardBarbershop;
    const roles = opts.context.dashboardRoles;

    if (!roles?.isOwner && !roles?.isStaff) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }

    if (barbershop?._id) {
      const plan = await opts.context.queryClient.ensureQueryData(
        getBarbershopPlanQueryOptions(barbershop._id),
      );

      if (!plan?.planLimits.inventoryEnabled) {
        return;
      }

      // Leaf: the first ledger page primes without blocking navigation.
      void opts.context.queryClient.prefetchQuery(
        shopMovementsPaginatedQueryOptions(
          barbershop._id,
          null,
          LEDGER_PAGE_SIZE,
        ),
      );
    }
  },
});

const InventoryUpsell: FC = () => (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <PackageIcon />
      </EmptyMedia>
      <EmptyTitle>
        El inventario está disponible en los planes Pro y Premium.
      </EmptyTitle>
      <EmptyDescription>
        Controla el stock de tus productos, recibe alertas de bajo stock y
        descuenta insumos automáticamente al completar servicios.
      </EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Button nativeButton={false} render={<Link to="/pricing" />}>
        Ver planes
      </Button>
    </EmptyContent>
  </Empty>
);

const NoBarbershop: FC = () => (
  <Empty>
    <EmptyHeader>
      <EmptyTitle>No tienes una barbería asociada.</EmptyTitle>
      <EmptyDescription>
        Crea o únete a una barbería para gestionar inventario.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

interface MovementsBodyProps {
  barbershop: Barbershop;
}

const MovementsBody: FC<MovementsBodyProps> = ({ barbershop }) => {
  const { planLimits, isLoading: isLoadingPlan } = useBarbershopPlan(
    barbershop._id,
  );

  if (isLoadingPlan) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!planLimits.inventoryEnabled) {
    return <InventoryUpsell />;
  }

  return (
    <MovementLedger barbershopId={barbershop._id} pageSize={LEDGER_PAGE_SIZE} />
  );
};

function RouteComponent() {
  const barbershop = Route.useRouteContext({
    select: (context) => context.dashboardBarbershop,
  });

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Movimientos"
          description={MOVEMENTS_DESCRIPTION}
        />
      </DashboardPageHeader>

      <DashboardPageContent>
        {barbershop?._id ? (
          <MovementsBody barbershop={barbershop} />
        ) : (
          <NoBarbershop />
        )}
      </DashboardPageContent>
    </DashboardPage>
  );
}
