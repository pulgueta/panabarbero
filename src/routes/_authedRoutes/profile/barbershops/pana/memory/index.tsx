import {
  ClockCounterClockwiseIcon,
  SparkleIcon,
  TrendUpIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

import {
  DashboardPage,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
  DashboardPageStats,
} from "@/components/dashboard/dashboard-page";
import { Badge } from "@/components/ui/badge";
import { cacheTime } from "@/config/cache";

const MEMORY_STATS = [
  { label: "Preferencias activas", value: "0", helper: "Pendiente" },
  { label: "Señales operativas", value: "0", helper: "Pendiente" },
  { label: "Alertas de contexto", value: "0", helper: "Sin alertas" },
] as const;

const MEMORY_LANES = [
  {
    label: "Preferencias",
    description:
      "Notas persistentes sobre tono, reglas internas y decisiones de atención.",
    status: "Preparado",
    icon: SparkleIcon,
  },
  {
    label: "Seguimiento",
    description:
      "Patrones que Pana puede recordar para sugerir acciones recurrentes.",
    status: "Preparado",
    icon: TrendUpIcon,
  },
  {
    label: "Auditoría",
    description:
      "Cambios relevantes deben quedar trazados por barbería, recurso y actor.",
    status: "Conectado",
    icon: ClockCounterClockwiseIcon,
  },
] as const;

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/pana/memory/",
)({
  component: PanaMemoryRoute,
  ssr: "data-only",
  staticData: { breadcrumb: "Memoria" },
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
});

function PanaMemoryRoute() {
  return (
    <DashboardPage className="p-4 sm:p-6">
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Memoria de Pana"
          description="Monitorea el estado de memoria y trazabilidad que usará Pana para operar con contexto."
        />
      </DashboardPageHeader>

      <DashboardPageStats>
        {MEMORY_STATS.map((stat) => (
          <div className="rounded-lg border bg-card p-4" key={stat.label}>
            <p className="text-muted-foreground text-xs">{stat.label}</p>
            <p className="mt-2 font-semibold text-2xl tracking-tight">
              {stat.value}
            </p>
            <p className="mt-1 text-muted-foreground text-xs">{stat.helper}</p>
          </div>
        ))}
      </DashboardPageStats>

      <DashboardPageContent>
        <div className="grid gap-3 lg:grid-cols-3">
          {MEMORY_LANES.map((lane) => {
            const Icon = lane.icon;

            return (
              <article
                className="rounded-lg border bg-card p-4 text-card-foreground"
                key={lane.label}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <Badge variant="outline">{lane.status}</Badge>
                </div>
                <h2 className="mt-4 font-semibold text-sm">{lane.label}</h2>
                <p className="mt-1 text-muted-foreground text-sm leading-5">
                  {lane.description}
                </p>
              </article>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <WarningCircleIcon className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="space-y-1">
              <h2 className="font-semibold text-sm">
                Edición de memoria como página dedicada
              </h2>
              <p className="max-w-3xl text-muted-foreground text-sm leading-5">
                Cuando se habilite la edición de memoria, cada flujo con más de
                tres campos debe vivir en una página propia para mantener el
                chat y los paneles laterales libres de formularios pesados.
              </p>
            </div>
          </div>
        </div>
      </DashboardPageContent>
    </DashboardPage>
  );
}
