import type { Barbershop } from "@convex/schema";
import { CheckIcon, CreditCardIcon, XIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBarbershopPlan } from "@/hooks/billing/use-plan";

const PLAN_LABELS = {
  free: "Plan gratis",
  pro: "Plan Pro",
  premium: "Plan Premium",
} as const;

const PLAN_DESCRIPTIONS = {
  free: "Lo esencial para empezar a recibir citas.",
  pro: "Equipo, inventario y más capacidad para hacer crecer tu barbería.",
  premium: "Todas las funciones de PanaBarbero, sin límites.",
} as const;

interface BillingPlanCardProps {
  barbershopId: Barbershop["_id"];
}

function formatLimit(value: number | null) {
  return value === null ? "Ilimitado" : value.toLocaleString("es-CO");
}

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <Badge variant={enabled ? "success" : "outline"}>
        {enabled ? <CheckIcon /> : <XIcon />}
        {enabled ? "Incluido" : "No incluido"}
      </Badge>
    </div>
  );
}

/**
 * Current-plan summary for the Facturación settings page. Reads the owner's
 * plan tier via `useBarbershopPlan` and links to the existing `/pricing`
 * surface (checkout + Polar customer portal) to manage the subscription.
 */
export const BillingPlanCard: FC<BillingPlanCardProps> = ({ barbershopId }) => {
  const { planTier, planLimits, isLoading } = useBarbershopPlan(barbershopId);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <Card size="sm">
        <CardContent className="flex h-full flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">Tu plan actual</p>
              {isLoading ? (
                <Skeleton className="h-6 w-28" />
              ) : (
                <p className="font-semibold text-lg tracking-tight">
                  {PLAN_LABELS[planTier]}
                </p>
              )}
            </div>
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <CreditCardIcon />
            </span>
          </div>

          <p className="text-pretty text-muted-foreground text-sm">
            {PLAN_DESCRIPTIONS[planTier]}
          </p>

          <Button
            nativeButton={false}
            render={<Link to="/pricing" />}
            variant="outline"
            className="mt-auto w-full sm:w-auto"
          >
            Gestionar plan
          </Button>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader className="border-b">
          <CardTitle className="text-base">Capacidad del plan</CardTitle>
          <CardDescription>
            Límites operativos activos para esta barbería.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <dl className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Barberos invitados</dt>
              <dd className="font-medium tabular-nums">
                {formatLimit(planLimits.maxInvitedBarbers)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Recepcionistas</dt>
              <dd className="font-medium tabular-nums">
                {formatLimit(planLimits.maxStaff)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">SMS mensuales</dt>
              <dd className="font-medium tabular-nums">
                {formatLimit(planLimits.maxSmsPerMonth)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Emails mensuales</dt>
              <dd className="font-medium tabular-nums">
                {formatLimit(planLimits.maxEmailPerMonth)}
              </dd>
            </div>
          </dl>

          <div className="grid gap-2">
            <FeatureRow
              label="Inventario"
              enabled={planLimits.inventoryEnabled}
            />
            <FeatureRow
              label="Citas creadas por el equipo"
              enabled={planLimits.staffCanCreateAppointments}
            />
            <FeatureRow
              label="Pana gestiona la barbería"
              enabled={planLimits.panaManagement}
            />
            <FeatureRow
              label="Memoria de Pana"
              enabled={planLimits.panaMemory}
            />
            <FeatureRow
              label="Base de conocimiento"
              enabled={planLimits.panaKnowledgeBase}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
