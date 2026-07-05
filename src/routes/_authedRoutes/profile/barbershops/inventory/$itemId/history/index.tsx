/** biome-ignore-all lint/style/noNonNullAssertion: route loader gates and primes the item data */

import type { InventoryItem } from "@convex/schema";
import {
  ArrowLeftIcon,
  ClockCounterClockwiseIcon,
  PackageIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import type { FC } from "react";

import {
  DashboardPage,
  DashboardPageActions,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { DashboardPending } from "@/components/dashboard/dashboard-pending";
import {
  formatInventoryStockSuffix,
  inventoryCategoryLabels,
  inventoryUnitLabels,
} from "@/components/inventory/labels";
import { InventoryMovementList } from "@/components/inventory/movement-history";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import { useBarbershopByMemberUserId } from "@/hooks/barbershop/use-barbershop";
import { getBarbershopPlanQueryOptions } from "@/hooks/billing/use-plan";
import type { InventoryItemAuditEvent } from "@/hooks/use-inventory";
import {
  inventoryItemAuditQueryOptions,
  inventoryItemQueryOptions,
  useInventoryItem,
  useInventoryItemAudit,
} from "@/hooks/use-inventory";
import { useSession } from "@/hooks/use-session";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/inventory/$itemId/history/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Historial" },
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async ({ context, params }) => {
    const barbershop = context.dashboardBarbershop;
    const roles = context.dashboardRoles;
    const itemId = params.itemId as InventoryItem["_id"];

    if (!barbershop?._id || (!roles?.isOwner && !roles?.isStaff)) {
      throw redirect({ to: "/profile/barbershops/inventory" });
    }

    const plan = await context.queryClient.ensureQueryData(
      getBarbershopPlanQueryOptions(barbershop._id),
    );

    if (!plan?.planLimits.inventoryEnabled) {
      throw redirect({ to: "/profile/barbershops/inventory" });
    }

    const itemData = await context.queryClient.ensureQueryData(
      inventoryItemQueryOptions(itemId),
    );

    if (itemData.item.barbershopId !== barbershop._id) {
      throw redirect({ to: "/profile/barbershops/inventory" });
    }

    void context.queryClient.prefetchQuery(
      inventoryItemAuditQueryOptions(itemId, 20),
    );
  },
});

const auditActionLabels: Record<string, string> = {
  "inventory.item.created": "Producto creado",
  "inventory.item.updated": "Producto actualizado",
  "inventory.item.archived": "Producto archivado",
  "inventory.item.restored": "Producto restaurado",
  "inventory.movement.receipt": "Recepción de stock",
  "inventory.movement.adjustment": "Ajuste de stock",
  "inventory.movement.sale": "Venta registrada",
  "inventory.movement.consumption": "Consumo registrado",
  "inventory.movement.waste": "Merma registrada",
  "inventory.movement.reservation": "Reserva de stock",
  "inventory.movement.release": "Liberación de reserva",
  "inventory.movement.return": "Devolución registrada",
  "inventory.movement.transfer_in": "Traslado de entrada",
  "inventory.movement.transfer_out": "Traslado de salida",
};

const severityVariants: Record<
  InventoryItemAuditEvent["severity"],
  BadgeProps["variant"]
> = {
  info: "outline",
  warning: "warning",
  error: "destructive",
  critical: "destructive",
};

const severityLabels: Record<InventoryItemAuditEvent["severity"], string> = {
  info: "Info",
  warning: "Atención",
  error: "Error",
  critical: "Crítico",
};

function formatEventDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDiff(diff?: string) {
  if (!diff) return null;

  const compact = diff
    .split("\n")
    .flatMap((line) => {
      const trimmed = line.trim();
      return trimmed ? [trimmed] : [];
    })
    .slice(0, 3)
    .join(" · ");

  return compact || null;
}

interface AuditTrailProps {
  itemId: InventoryItem["_id"];
}

const AuditTrail: FC<AuditTrailProps> = ({ itemId }) => {
  const { data: events, isLoading } = useInventoryItemAudit(itemId, 20);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <p className="py-6 text-center text-muted-foreground text-sm">
        Aún no hay eventos de auditoría para este producto.
      </p>
    );
  }

  return (
    <div className="divide-y">
      {events.map((event: InventoryItemAuditEvent) => {
        const diff = formatDiff(event.diff);

        return (
          <div key={event._id} className="space-y-1.5 py-3 first:pt-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-sm">
                  {auditActionLabels[event.action] ?? event.action}
                </p>
                <p
                  className="text-muted-foreground text-xs"
                  suppressHydrationWarning
                >
                  {formatEventDate(event.timestamp)}
                </p>
              </div>
              <Badge variant={severityVariants[event.severity]}>
                {severityLabels[event.severity]}
              </Badge>
            </div>

            {diff ? (
              <p className="line-clamp-2 text-muted-foreground text-xs">
                {diff}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

function RouteComponent() {
  const { itemId } = Route.useParams();
  const typedItemId = itemId as InventoryItem["_id"];
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByMemberUserId(user?.id ?? "");
  const { data } = useInventoryItem(typedItemId);

  if (!barbershop?._id || data.item.barbershopId !== barbershop._id) {
    return null;
  }

  const item = data.item;
  const onHand = data.levels.reduce((total, level) => total + level.onHand, 0);
  const reserved = data.levels.reduce(
    (total, level) => total + level.reserved,
    0,
  );
  const stockSuffix = formatInventoryStockSuffix(onHand, item.unit);
  const unitCost =
    "unitCost" in item && typeof item.unitCost === "number" ? item.unitCost : 0;
  const value = onHand * unitCost;
  const isArchived = item.deletedAt !== undefined;

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Historial del producto"
          description={`Movimientos y auditoría de ${item.name}.`}
        />
        <DashboardPageActions>
          {isArchived && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/profile/barbershops/inventory/archived" />}
            >
              <ClockCounterClockwiseIcon />
              Archivados
            </Button>
          )}
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/profile/barbershops/inventory" />}
          >
            <ArrowLeftIcon />
            Volver
          </Button>
        </DashboardPageActions>
      </DashboardPageHeader>

      <DashboardPageContent>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Movimientos</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <InventoryMovementList
                  itemId={item._id}
                  unit={item.unit}
                  pageSize={20}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg">
                  Auditoría del producto
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <AuditTrail itemId={item._id} />
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Card size="sm">
              <CardHeader className="border-b">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                    <PackageIcon className="size-5 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate text-base">
                      {item.name}
                    </CardTitle>
                    <Badge variant={isArchived ? "warning" : "outline"}>
                      {isArchived ? "Archivado" : "Inventario"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Stock actual</dt>
                    <dd className="font-medium tabular-nums">
                      {onHand} {stockSuffix}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Reservado</dt>
                    <dd className="font-medium tabular-nums">
                      {reserved} {stockSuffix}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Categoría</dt>
                    <dd className="font-medium">
                      {inventoryCategoryLabels[item.category]}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Unidad</dt>
                    <dd className="font-medium">
                      {inventoryUnitLabels[item.unit]}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Valor</dt>
                    <dd className="font-medium tabular-nums">
                      {formatCurrency(value)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </aside>
        </div>
      </DashboardPageContent>
    </DashboardPage>
  );
}
