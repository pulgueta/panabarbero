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
  formatPresentation,
  inventoryCategoryLabels,
  inventoryFieldLabels,
  inventoryMovementTypeData,
  inventoryPresentationUnitLabels,
  inventoryStockBehaviorLabels,
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

const auditActionDescriptions: Record<string, string> = {
  "inventory.item.created": "Se creó la ficha del producto.",
  "inventory.item.updated": "Se modificaron datos de la ficha del producto.",
  "inventory.item.archived": "El producto salió del inventario activo.",
  "inventory.item.restored": "El producto volvió al inventario activo.",
  "inventory.movement.receipt": "Entró stock al inventario.",
  "inventory.movement.adjustment": "Se corrigió manualmente el saldo de stock.",
  "inventory.movement.sale": "Se registró una salida por venta.",
  "inventory.movement.consumption": "Se descontó stock por consumo operativo.",
  "inventory.movement.waste": "Se descontó stock por merma.",
  "inventory.movement.reservation": "Se apartó stock para una cita o servicio.",
  "inventory.movement.release": "Se liberó stock que estaba reservado.",
  "inventory.movement.return": "Se registró una devolución al inventario.",
  "inventory.movement.transfer_in": "Entró stock por traslado.",
  "inventory.movement.transfer_out": "Salió stock por traslado.",
};

const auditResourceLabels: Record<string, string> = {
  "inventory.item": "Producto de inventario",
};

const auditFieldLabels: Record<string, string> = {
  ...inventoryFieldLabels,
  available: "Stock disponible",
  balanceAfter: "Saldo final",
  belowReorder: "Bajo punto de pedido",
  locationId: "Ubicación",
  movementId: "Movimiento",
  movementType: "Tipo de movimiento",
  onHand: "Stock actual",
  quantity: "Cantidad",
  reason: "Motivo",
  relatedAppointmentId: "Cita relacionada",
  reserved: "Reservado",
};

const userVisibleAuditFields = new Set([
  "name",
  "category",
  "stockBehavior",
  "unit",
  "presentationValue",
  "presentationUnit",
  "brand",
  "supplier",
  "customLabel",
  "model",
  "serialNumber",
  "purchasedAt",
  "warrantyUntil",
  "notes",
  "isSellable",
  "unitCost",
  "salePrice",
  "reorderPoint",
  "reorderQuantity",
  "deletedAt",
  "onHand",
  "reserved",
  "available",
  "quantity",
  "reason",
]);

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

const booleanLabels: Record<string, string> = {
  true: "Sí",
  false: "No",
};

const esCoNumberFormatter = new Intl.NumberFormat("es-CO");

function formatEventDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatRawDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseAuditValue(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function formatAuditValue(field: string, value: unknown): string {
  if (value === undefined) return "Sin dato";
  if (value === null) return "Vacío";

  if (typeof value === "boolean") {
    return booleanLabels[String(value)];
  }

  if (typeof value === "number") {
    if (
      field === "unitCost" ||
      field === "salePrice" ||
      field === "salePriceAtTime"
    ) {
      return formatCurrency(value);
    }

    if (
      field === "deletedAt" ||
      field === "purchasedAt" ||
      field === "warrantyUntil"
    ) {
      return formatRawDate(value);
    }

    return esCoNumberFormatter.format(value);
  }

  if (typeof value === "string") {
    if (field === "category" && value in inventoryCategoryLabels) {
      return inventoryCategoryLabels[
        value as keyof typeof inventoryCategoryLabels
      ];
    }

    if (field === "unit" && value in inventoryUnitLabels) {
      return inventoryUnitLabels[value as keyof typeof inventoryUnitLabels];
    }

    if (field === "stockBehavior" && value in inventoryStockBehaviorLabels) {
      return inventoryStockBehaviorLabels[
        value as keyof typeof inventoryStockBehaviorLabels
      ];
    }

    if (
      field === "presentationUnit" &&
      value in inventoryPresentationUnitLabels
    ) {
      return inventoryPresentationUnitLabels[
        value as keyof typeof inventoryPresentationUnitLabels
      ];
    }

    if (field === "movementType" && value in inventoryMovementTypeData) {
      return inventoryMovementTypeData[
        value as keyof typeof inventoryMovementTypeData
      ].label;
    }

    return value;
  }

  return JSON.stringify(value);
}

function auditRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readAuditNumber(
  record: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = record[key];
  return typeof value === "number" ? value : undefined;
}

function readAuditString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

function formatQuantity(value: number | undefined): string | undefined {
  return typeof value === "number"
    ? esCoNumberFormatter.format(value)
    : undefined;
}

function getAuditSummary(event: InventoryItemAuditEvent): string {
  const after = auditRecord(event.after);
  const before = auditRecord(event.before);

  if (!event.action.startsWith("inventory.movement.")) {
    return auditActionDescriptions[event.action] ?? "Evento registrado.";
  }

  const quantity = formatQuantity(readAuditNumber(after, "quantity"));
  const balance = formatQuantity(readAuditNumber(after, "onHand"));
  const available = formatQuantity(readAuditNumber(after, "available"));
  const reason = readAuditString(after, "reason");
  const previousBalance = formatQuantity(readAuditNumber(before, "onHand"));
  const parts = [
    quantity ? `Cantidad: ${quantity}` : null,
    previousBalance && balance
      ? `Stock: ${previousBalance} → ${balance}`
      : null,
    available ? `Disponible: ${available}` : null,
    reason ? `Motivo: ${reason}` : null,
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(" · ")
    : (auditActionDescriptions[event.action] ?? "Movimiento registrado.");
}

type AuditChange = {
  marker: "+" | "-" | "~";
  field: string;
  label: string;
  before?: string;
  after?: string;
};

function parseDiff(diff?: string): AuditChange[] {
  if (!diff) return [];

  return diff
    .split("\n")
    .flatMap((line) => {
      const trimmed = line.trim();
      return trimmed ? [trimmed] : [];
    })
    .flatMap((line): AuditChange[] => {
      const match = line.match(/^([+~-])\s*([^:]+):\s*(.*)$/);

      if (!match) {
        return [];
      }

      const [, marker, field, payload] = match;
      const [beforeRaw, afterRaw] =
        marker === "~" ? payload.split(" → ") : [undefined, payload];
      const label = auditFieldLabels[field] ?? field;

      return [
        {
          marker: marker as AuditChange["marker"],
          field,
          label,
          before:
            beforeRaw === undefined
              ? undefined
              : formatAuditValue(field, parseAuditValue(beforeRaw)),
          after:
            afterRaw === undefined
              ? undefined
              : formatAuditValue(field, parseAuditValue(afterRaw)),
        },
      ];
    });
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
        const changes = parseDiff(event.diff);
        const visibleChanges = changes
          .filter((change) => userVisibleAuditFields.has(change.field))
          .slice(0, 4);
        const actionLabel = auditActionLabels[event.action] ?? event.action;
        const auditSummary = getAuditSummary(event);
        const resourceLabel = event.resourceType
          ? (auditResourceLabels[event.resourceType] ?? event.resourceType)
          : "Recurso";

        return (
          <article key={event._id} className="space-y-3 py-4 first:pt-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <p className="font-semibold text-sm">{actionLabel}</p>
                <p className="text-sm leading-5">{auditSummary}</p>
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

            {visibleChanges.length > 0 ? (
              <div className="space-y-2">
                <p className="font-medium text-sm">Detalle del cambio</p>
                <div className="divide-y rounded-lg border">
                  {visibleChanges.map((change, index) => (
                    <div
                      className="grid gap-2 p-3 sm:grid-cols-[minmax(12rem,18rem)_1fr]"
                      key={`${event._id}-${change.field}-${index}`}
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{change.label}</p>
                        <p className="text-muted-foreground text-xs">
                          {change.marker === "~"
                            ? "Valor actualizado"
                            : change.marker === "+"
                              ? "Dato agregado"
                              : "Dato retirado"}
                        </p>
                      </div>
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        {change.before !== undefined ? (
                          <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">
                              Antes
                            </p>
                            <p className="truncate font-semibold">
                              {change.before}
                            </p>
                          </div>
                        ) : null}
                        {change.after !== undefined ? (
                          <div className="min-w-0">
                            <p className="text-muted-foreground text-xs">
                              Después
                            </p>
                            <p className="truncate font-semibold">
                              {change.after}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No hay campos de negocio adicionales para mostrar en este
                evento.
              </p>
            )}

            <details className="group rounded-lg border border-dashed p-3 text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground group-open:text-foreground">
                Datos técnicos del registro
              </summary>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Clave original</dt>
                  <dd className="mt-0.5 truncate font-mono">{event.action}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Recurso</dt>
                  <dd className="mt-0.5 truncate font-medium">
                    {resourceLabel}
                  </dd>
                  {event.resourceType ? (
                    <dd className="mt-1 truncate font-mono text-muted-foreground">
                      {event.resourceType}
                    </dd>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <dt className="text-muted-foreground">Actor</dt>
                  <dd className="mt-0.5 truncate font-medium">
                    {event.actorId ?? "Sistema"}
                  </dd>
                </div>
                {event.resourceId ? (
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">ID trazable</dt>
                    <dd className="mt-0.5 truncate font-mono">
                      {event.resourceId}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </details>
          </article>
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
  const supplier =
    "supplier" in item && typeof item.supplier === "string"
      ? item.supplier
      : undefined;
  const model =
    "model" in item && typeof item.model === "string" ? item.model : undefined;
  const serialNumber =
    "serialNumber" in item && typeof item.serialNumber === "string"
      ? item.serialNumber
      : undefined;
  const purchasedAt =
    "purchasedAt" in item && typeof item.purchasedAt === "number"
      ? item.purchasedAt
      : undefined;
  const warrantyUntil =
    "warrantyUntil" in item && typeof item.warrantyUntil === "number"
      ? item.warrantyUntil
      : undefined;
  const notes =
    "notes" in item && typeof item.notes === "string" ? item.notes : undefined;
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
            <Card className="gap-0">
              <CardHeader className="!pb-4 border-b">
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

            <Card className="gap-0">
              <CardHeader className="!pb-4 border-b">
                <CardTitle className="text-lg">
                  Auditoría del producto
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Revisa qué cambió, quién lo hizo y cómo quedó el inventario.
                </p>
              </CardHeader>
              <CardContent className="py-0">
                <AuditTrail itemId={item._id} />
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Card size="sm" className="gap-0">
              <CardHeader className="!pb-4 border-b">
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
                  {item.customLabel ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Etiqueta</dt>
                      <dd className="font-medium">{item.customLabel}</dd>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Tipo de manejo</dt>
                    <dd className="font-medium">
                      {inventoryStockBehaviorLabels[item.stockBehavior]}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Unidad</dt>
                    <dd className="font-medium">
                      {inventoryUnitLabels[item.unit]}
                    </dd>
                  </div>
                  {item.presentationValue && item.presentationUnit ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">
                        Contenido por unidad
                      </dt>
                      <dd className="font-medium tabular-nums">
                        {formatPresentation(
                          item.presentationValue,
                          item.presentationUnit,
                        )}
                      </dd>
                    </div>
                  ) : null}
                  {item.brand ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Marca</dt>
                      <dd className="font-medium">{item.brand}</dd>
                    </div>
                  ) : null}
                  {model ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Modelo</dt>
                      <dd className="font-medium">{model}</dd>
                    </div>
                  ) : null}
                  {serialNumber ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">N.º de serie</dt>
                      <dd className="font-medium">{serialNumber}</dd>
                    </div>
                  ) : null}
                  {supplier ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Proveedor</dt>
                      <dd className="font-medium">{supplier}</dd>
                    </div>
                  ) : null}
                  {purchasedAt ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Fecha de compra</dt>
                      <dd className="font-medium" suppressHydrationWarning>
                        {formatDateOnly(purchasedAt)}
                      </dd>
                    </div>
                  ) : null}
                  {warrantyUntil ? (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-muted-foreground">Garantía hasta</dt>
                      <dd className="font-medium" suppressHydrationWarning>
                        {formatDateOnly(warrantyUntil)}
                      </dd>
                    </div>
                  ) : null}
                  {notes ? (
                    <div className="space-y-1">
                      <dt className="text-muted-foreground">Notas</dt>
                      <dd className="font-medium">{notes}</dd>
                    </div>
                  ) : null}
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
