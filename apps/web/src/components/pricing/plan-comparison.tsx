import type { PlanLimits, PlanTier } from "@convex/plans";
import { PLAN_LIMITS } from "@convex/plans";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FREE_MAX_BARBERS } from "@/config/home-faqs";
import { cn } from "@/lib/utils";

const numberFmt = new Intl.NumberFormat("es-CO");

const TIER_COLUMNS: { tier: PlanTier; name: string }[] = [
  { tier: "free", name: "Independiente" },
  { tier: "pro", name: "Barbería" },
  { tier: "premium", name: "Barbería Profesional" },
];

const included = (flag: boolean) => (flag ? "Incluido" : "—");

/**
 * Feature-by-feature rows derived from `PLAN_LIMITS` (single source of truth,
 * same as the pricing-card benefits) plus the static marketing rows every
 * tier shares.
 */
const featureRows = (limits: PlanLimits, tier: PlanTier) => ({
  "Barberos invitados":
    limits.maxInvitedBarbers === null
      ? "Ilimitados"
      : `Hasta ${limits.maxInvitedBarbers}`,
  Recepcionistas:
    limits.maxStaff === null
      ? "Ilimitados"
      : limits.maxStaff === 0
        ? "—"
        : `Hasta ${limits.maxStaff}`,
  "Agenda y reservas en línea": "Incluido",
  "Citas creadas por tu equipo": included(limits.staffCanCreateAppointments),
  "SMS por mes":
    limits.maxSmsPerMonth === null
      ? "Ilimitados"
      : numberFmt.format(limits.maxSmsPerMonth),
  "Correos por mes":
    limits.maxEmailPerMonth === null
      ? "Ilimitados"
      : numberFmt.format(limits.maxEmailPerMonth),
  "Módulo de inventario": included(limits.inventoryEnabled),
  "Pana IA": included(limits.panaManagement),
  "Memoria de Pana": included(limits.panaMemory),
  "Base de conocimiento propia": included(limits.panaKnowledgeBase),
  "Notificaciones en tiempo real": "Incluido",
  Soporte: tier === "free" ? "Estándar" : "Prioritario",
});

const COLUMNS = TIER_COLUMNS.map((column) => ({
  ...column,
  features: featureRows(PLAN_LIMITS[column.tier], column.tier),
}));

const ROW_LABELS = Object.keys(COLUMNS[0].features) as (keyof ReturnType<
  typeof featureRows
>)[];

/** "Compara los planes" table + closing CTA for `/pricing`. */
export const PlanComparison: FC = () => (
  <>
    <Separator className="my-4" />

    <section className="space-y-5">
      <h2 className="font-semibold text-2xl tracking-tight">
        Compara los planes
      </h2>

      <Card className="py-0">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead className="px-5 py-3.5 text-muted-foreground text-xs">
                Funcionalidad
              </TableHead>
              {COLUMNS.map((column) => (
                <TableHead className="px-5 py-3.5" key={column.tier}>
                  {column.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROW_LABELS.map((label) => (
              <TableRow key={label}>
                <TableHead className="px-5 py-3 font-medium" scope="row">
                  {label}
                </TableHead>
                {COLUMNS.map((column) => (
                  <TableCell
                    className={cn(
                      "px-5 py-3 tabular-nums",
                      column.features[label] === "—" && "text-muted-foreground",
                    )}
                    key={column.tier}
                  >
                    {column.features[label]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>

    <Separator className="my-4" />

    <section className="flex flex-col items-center gap-4 text-center">
      <h2 className="text-balance font-semibold text-2xl tracking-tight">
        ¿Dudas sobre qué plan te sirve?
      </h2>
      <p className="max-w-prose text-pretty text-muted-foreground text-sm">
        Empieza gratis con hasta {FREE_MAX_BARBERS} barberos y cambia de plan
        cuando necesites inventario y Pana IA. Sin permanencia mínima.
      </p>
      <Button nativeButton={false} render={<Link to="/login" />} size="lg">
        Comenzar gratis
      </Button>
    </section>
  </>
);
