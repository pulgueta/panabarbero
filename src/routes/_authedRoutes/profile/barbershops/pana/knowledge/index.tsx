import {
  BrainIcon,
  CalendarIcon,
  PackageIcon,
  ScissorsIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { createFileRoute, redirect } from "@tanstack/react-router";

import {
  DashboardPage,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { Badge } from "@/components/ui/badge";
import { cacheTime } from "@/config/cache";

const KNOWLEDGE_SOURCES = [
  {
    label: "Citas",
    description:
      "Disponibilidad, solicitudes de reagendamiento y estado diario.",
    status: "Activo",
    icon: CalendarIcon,
  },
  {
    label: "Servicios",
    description: "Catálogo, precios, duración y recetas de consumo.",
    status: "Activo",
    icon: ScissorsIcon,
  },
  {
    label: "Inventario",
    description: "Stock, costos, alertas y movimientos registrados.",
    status: "Activo",
    icon: PackageIcon,
  },
  {
    label: "Equipo",
    description: "Roles, servicios asignados y horarios personalizados.",
    status: "Activo",
    icon: UsersIcon,
  },
] as const;

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/pana/knowledge/",
)({
  component: PanaKnowledgeRoute,
  ssr: "data-only",
  staticData: { breadcrumb: "Conocimiento" },
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  beforeLoad: () => {
    throw redirect({ to: "/profile/barbershops/pana" });
  },
});

function PanaKnowledgeRoute() {
  return (
    <DashboardPage className="p-4 sm:p-6">
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Conocimiento de Pana"
          description="Revisa qué fuentes internas puede usar Pana para responder y ejecutar acciones de operación."
        />
      </DashboardPageHeader>

      <DashboardPageContent>
        <div className="grid gap-3 md:grid-cols-2">
          {KNOWLEDGE_SOURCES.map((source) => {
            const Icon = source.icon;

            return (
              <article
                className="rounded-lg border bg-card p-4 text-card-foreground"
                key={source.label}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-semibold text-sm">{source.label}</h2>
                      <Badge variant="secondary">{source.status}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm leading-5">
                      {source.description}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
              <BrainIcon className="size-4" weight="fill" />
            </span>
            <div className="space-y-1">
              <h2 className="font-semibold text-sm">
                Arquitectura preparada para más fuentes
              </h2>
              <p className="max-w-3xl text-muted-foreground text-sm leading-5">
                Esta sección se mantiene como un inventario visual de contexto:
                cuando se agreguen documentos, políticas o métricas externas,
                deben entrar como fuentes separadas y auditables, no como campos
                sueltos dentro del chat.
              </p>
            </div>
          </div>
        </div>
      </DashboardPageContent>
    </DashboardPage>
  );
}
