import type { Barbershop } from "@convex/schema";
import { PackageIcon } from "@phosphor-icons/react";
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { type FC, Suspense } from "react";

import {
  DashboardPage,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { DashboardPending } from "@/components/dashboard/dashboard-pending";
import { SaleBuilder } from "@/components/inventory/sales/sale-builder";
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
import { sellableItemsQueryOptions } from "@/hooks/use-inventory-sales";

const NEW_SALE_DESCRIPTION =
  "Agrega los productos vendidos, revisa el resumen y confirma para descontar el inventario.";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/inventory/sales/new/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Registrar venta" },
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  beforeLoad: (opts) => {
    const roles = opts.context.dashboardRoles;

    if (
      !roles?.isOwner &&
      !roles?.isStaff &&
      !roles?.roles?.includes("barber")
    ) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }
  },
  loader: async ({ context }) => {
    const barbershop = context.dashboardBarbershop;

    if (!barbershop?._id) return;

    const plan = await context.queryClient.ensureQueryData(
      getBarbershopPlanQueryOptions(barbershop._id),
    );

    if (plan?.planLimits.inventoryEnabled) {
      await context.queryClient.ensureQueryData(
        sellableItemsQueryOptions(barbershop._id),
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
        Registra ventas y descuenta el stock de forma automática.
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
        Crea o únete a una barbería para registrar ventas.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

interface NewSaleBodyProps {
  barbershop: Barbershop;
}

const NewSaleBody: FC<NewSaleBodyProps> = ({ barbershop }) => {
  const navigate = useNavigate();
  const { planLimits, isLoading } = useBarbershopPlan(barbershop._id);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!planLimits.inventoryEnabled) return <InventoryUpsell />;

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <SaleBuilder
        barbershopId={barbershop._id}
        onRegistered={() =>
          void navigate({ to: "/profile/barbershops/inventory/sales" })
        }
      />
    </Suspense>
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
          title="Registrar venta"
          description={NEW_SALE_DESCRIPTION}
        />
      </DashboardPageHeader>
      <DashboardPageContent>
        {barbershop ? (
          <NewSaleBody barbershop={barbershop} />
        ) : (
          <NoBarbershop />
        )}
      </DashboardPageContent>
    </DashboardPage>
  );
}
