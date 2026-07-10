/** biome-ignore-all lint/style/noNonNullAssertion: dashboard loaders gate and prime this route */

import type { Service } from "@convex/schema";
import { PackageIcon, ScissorsIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import {
  DashboardPage,
  DashboardPageActions,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { DashboardPending } from "@/components/dashboard/dashboard-pending";
import {
  FormPageAside,
  FormPageBody,
  FormPageFields,
} from "@/components/form/form-page";
import { ServiceRecipeEditor } from "@/components/inventory/service-recipe-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cacheTime } from "@/config/cache";
import { getBarbershopPlanQueryOptions } from "@/hooks/billing/use-plan";
import {
  inventoryOverviewQueryOptions,
  serviceRecipeQueryOptions,
  useInventoryOverview,
  useServiceRecipe,
} from "@/hooks/use-inventory";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/services/$serviceId/recipe/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Insumos" },
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async ({ context, params }) => {
    const barbershop = context.dashboardBarbershop;
    const roles = context.dashboardRoles;

    if (!roles?.isOwner && !roles?.isStaff) {
      throw redirect({ to: "/profile/barbershops/services" });
    }

    if (!barbershop?._id) {
      throw redirect({ to: "/profile/barbershops/services" });
    }

    const plan = await context.queryClient.ensureQueryData(
      getBarbershopPlanQueryOptions(barbershop._id),
    );

    if (!plan?.planLimits.inventoryEnabled) {
      throw redirect({ to: "/profile/barbershops/services" });
    }

    await Promise.all([
      context.queryClient.ensureQueryData(servicesQueryOptions(barbershop._id)),
      context.queryClient.ensureQueryData(
        inventoryOverviewQueryOptions(barbershop._id),
      ),
      context.queryClient.ensureQueryData(
        serviceRecipeQueryOptions(params.serviceId as Service["_id"]),
      ),
    ]);
  },
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const { serviceId } = Route.useParams();
  const barbershop = Route.useRouteContext({
    select: (context) => context.dashboardBarbershop,
  });
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);
  const service = services.find((nextService) => nextService._id === serviceId);
  const { data: overview } = useInventoryOverview(barbershop?._id!);
  const { data: recipe } = useServiceRecipe(serviceId as Service["_id"]);

  if (!barbershop?._id) {
    return null;
  }

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Insumos del servicio"
          description={
            service
              ? `Define los productos que se consumen cuando reservas ${service.name}.`
              : "Define los productos que se consumen con este servicio."
          }
        />
        <DashboardPageActions>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/profile/barbershops/services" />}
          >
            Cancelar
          </Button>
        </DashboardPageActions>
      </DashboardPageHeader>

      <DashboardPageContent>
        <FormPageBody className="lg:grid-cols-[minmax(0,42rem)_22rem] xl:grid-cols-[minmax(0,42rem)_24rem]">
          <FormPageFields>
            <ServiceRecipeEditor
              serviceId={serviceId as Service["_id"]}
              barbershopId={barbershop._id}
              onSuccess={() => {
                void navigate({ to: "/profile/barbershops/services" });
              }}
            />
          </FormPageFields>

          <FormPageAside>
            <Card size="sm">
              <CardHeader className="border-b">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ScissorsIcon />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate text-base">
                      {service?.name ?? "Servicio"}
                    </CardTitle>
                    <Badge variant="outline">Consumo automático</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Duración</dt>
                    <dd className="font-medium tabular-nums">
                      {service ? `${service.duration} min` : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">
                      Productos disponibles
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {
                        // Durable items are excluded from recipes — count only
                        // what the dropdown actually offers.
                        overview.rows.filter(
                          (row) => row.stockBehavior !== "durable",
                        ).length
                      }
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Insumos asociados</dt>
                    <dd className="font-medium tabular-nums">
                      {recipe?.filter(
                        (line) => !line.isArchived && !line.isDurable,
                      ).length ?? 0}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <PackageIcon className="size-4 text-muted-foreground" />
                  <p className="font-medium text-sm">Cómo afecta el stock</p>
                </div>
                <p className="text-muted-foreground text-sm">
                  Cada reserva aparta los insumos configurados y al completar la
                  cita se descuenta el consumo real del inventario.
                </p>
              </CardContent>
            </Card>
          </FormPageAside>
        </FormPageBody>
      </DashboardPageContent>
    </DashboardPage>
  );
}
