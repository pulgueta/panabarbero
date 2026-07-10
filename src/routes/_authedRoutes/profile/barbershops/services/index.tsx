import type { Barbershop } from "@convex/schema";
import { PlusIcon, ScissorsIcon } from "@phosphor-icons/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import type { FC } from "react";
import { lazy, Suspense, useMemo, useState } from "react";

import type { ServiceRow } from "@/components/barbershops/services/columns";
import { getServicesTableColumns } from "@/components/barbershops/services/columns";
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
import {
  DataTableReset,
  DataTableSearch,
  DataTableToolbar,
} from "@/components/table/data-table-toolbar";
import { useDataTable } from "@/components/table/use-data-table";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cacheTime } from "@/config/cache";
import { useBarbershopByMemberUserId } from "@/hooks/barbershop/use-barbershop";
import { useBarbershopMemberRoles } from "@/hooks/barbershop/use-barbershop-member";
import {
  getBarbershopPlanQueryOptions,
  useBarbershopPlan,
} from "@/hooks/billing/use-plan";
import {
  serviceSupplyCountsQueryOptions,
  useServiceSupplyCounts,
} from "@/hooks/use-inventory";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { useSession } from "@/hooks/use-session";

const ServiceDialog = lazy(() =>
  import("@/components/barbershops/services/service-dialog").then((module) => ({
    default: module.ServiceDialog,
  })),
);

const DeleteServiceDialog = lazy(() =>
  import("@/components/barbershops/services/delete-service-dialog").then(
    (module) => ({ default: module.DeleteServiceDialog }),
  ),
);

const SERVICES_DESCRIPTION = "Administra los servicios que ofrece tu barbería.";

const ServicesPending: FC = () => (
  <DashboardPage>
    <DashboardPageHeader>
      <DashboardPageHeading
        title="Servicios"
        description={SERVICES_DESCRIPTION}
      />
    </DashboardPageHeader>

    <DashboardPageContent>
      <DataTableSkeleton columns={5} rows={6} />
    </DashboardPageContent>
  </DashboardPage>
);

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/services/",
)({
  component: RouteComponent,
  pendingComponent: ServicesPending,
  ssr: "data-only",
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  loader: async (opts) => {
    const barbershop = opts.context.dashboardBarbershop;
    const barbershopMemberRoles = opts.context.dashboardRoles;

    if (!barbershopMemberRoles?.isOwner && !barbershopMemberRoles?.isStaff) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }

    if (barbershop?._id) {
      const [, plan] = await Promise.all([
        opts.context.queryClient.ensureQueryData(
          servicesQueryOptions(barbershop._id),
        ),
        opts.context.queryClient.ensureQueryData(
          getBarbershopPlanQueryOptions(barbershop._id),
        ),
      ]);

      if (plan?.planLimits.inventoryEnabled) {
        await opts.context.queryClient.ensureQueryData(
          serviceSupplyCountsQueryOptions(barbershop._id),
        );
      }
    }
  },
});

type ServicesDialogState = {
  type: "edit" | "delete";
  row: ServiceRow;
} | null;

interface ServicesDashboardProps {
  barbershopId: Barbershop["_id"];
  canManage: boolean;
}

const ServicesDashboard: FC<ServicesDashboardProps> = ({
  barbershopId,
  canManage,
}) => {
  const navigate = Route.useNavigate();
  const [dialog, setDialog] = useState<ServicesDialogState>(null);

  const { data: rows } = useServicesFromBarbershop(barbershopId);
  const { planLimits } = useBarbershopPlan(barbershopId);
  const inventoryEnabled = planLimits.inventoryEnabled;
  const { data: supplyCounts = [] } = useServiceSupplyCounts(
    barbershopId,
    canManage && inventoryEnabled,
  );

  const editInitialValues = useMemo(
    () =>
      dialog?.type === "edit"
        ? {
            name: dialog.row.name,
            price: dialog.row.price,
            duration: dialog.row.duration,
            barbershopId,
          }
        : undefined,
    [dialog, barbershopId],
  );

  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null);
  };

  const supplyCountByServiceId = useMemo(() => {
    if (!inventoryEnabled) return undefined;

    return new Map(
      supplyCounts.map((row) => [row.serviceId, row.supplyCount] as const),
    );
  }, [inventoryEnabled, supplyCounts]);

  const columns = getServicesTableColumns({
    canManage,
    supplyCountByServiceId,
    onEdit: (row) => setDialog({ type: "edit", row }),
    onRecipe: (row) =>
      void navigate({
        to: "/profile/barbershops/services/$serviceId/recipe",
        params: { serviceId: row._id },
      }),
    onDelete: (row) => setDialog({ type: "delete", row }),
  });

  const table = useDataTable({
    data: rows,
    columns,
    pageSize: 10,
    initialSorting: [{ id: "name", desc: false }],
  });

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ScissorsIcon />
          </EmptyMedia>
          <EmptyTitle>Aún no tienes servicios.</EmptyTitle>
          <EmptyDescription>
            Crea tu primer servicio para que tus clientes puedan reservarlo.
          </EmptyDescription>
        </EmptyHeader>
        {canManage && (
          <EmptyContent>
            <Suspense
              fallback={
                <Button disabled>
                  <PlusIcon />
                  Crear servicio
                </Button>
              }
            >
              <ServiceDialog
                barbershopId={barbershopId}
                trigger={
                  <Button>
                    <PlusIcon />
                    Crear servicio
                  </Button>
                }
              />
            </Suspense>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <DataTable table={table}>
        <DataTableToolbar>
          <DataTableSearch placeholder="Buscar servicio…" />
          <DataTableReset />
        </DataTableToolbar>
        <DataTableContent />
        <DataTablePagination />
      </DataTable>

      <Suspense fallback={null}>
        {dialog?.type === "edit" && (
          <ServiceDialog
            barbershopId={barbershopId}
            serviceId={dialog.row._id}
            initialValues={editInitialValues}
            open
            onOpenChange={closeDialog}
          />
        )}

        {dialog?.type === "delete" && (
          <DeleteServiceDialog
            serviceId={dialog.row._id}
            barbershopId={barbershopId}
            open
            onOpenChange={closeDialog}
          />
        )}
      </Suspense>
    </div>
  );
};

function RouteComponent() {
  const { data: user } = useSession();
  const userId = user?.id ?? "";
  const { data: rolesData } = useBarbershopMemberRoles(userId);
  const { data: barbershop, isLoading: isLoadingBarbershop } =
    useBarbershopByMemberUserId(userId);

  const canManage = Boolean(rolesData?.isOwner || rolesData?.isStaff);

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Servicios"
          description={SERVICES_DESCRIPTION}
        />

        {barbershop?._id && canManage && (
          <DashboardPageActions>
            <Suspense
              fallback={
                <Button disabled>
                  <PlusIcon />
                  Nuevo servicio
                </Button>
              }
            >
              <ServiceDialog
                barbershopId={barbershop._id}
                trigger={
                  <Button>
                    <PlusIcon />
                    Nuevo servicio
                  </Button>
                }
              />
            </Suspense>
          </DashboardPageActions>
        )}
      </DashboardPageHeader>

      <DashboardPageContent>
        {isLoadingBarbershop ? (
          <DataTableSkeleton columns={4} rows={6} />
        ) : !barbershop?._id ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScissorsIcon />
              </EmptyMedia>
              <EmptyTitle>No tienes una barbería asociada.</EmptyTitle>
              <EmptyDescription>
                Crea o únete a una barbería para gestionar servicios.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Suspense fallback={<DataTableSkeleton columns={4} rows={6} />}>
            <ServicesDashboard
              barbershopId={barbershop._id}
              canManage={canManage}
            />
          </Suspense>
        )}
      </DashboardPageContent>
    </DashboardPage>
  );
}
