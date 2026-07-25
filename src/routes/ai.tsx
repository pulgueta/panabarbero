import {
  CalendarPlusIcon,
  ChartLineUpIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { PanaLiveChat } from "@/components/landing/pana-live-chat";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getCanonicalUrl,
  seo,
  softwareApplicationStructuredData,
} from "@/lib/utils";

const LandingFooter = lazy(() =>
  import("@/components/landing/footer").then((module) => ({
    default: module.LandingFooter,
  })),
);

const CAPABILITIES = [
  {
    icon: CalendarPlusIcon,
    title: "Crea y mueve citas",
    description:
      "Pídele una cita por chat y Pana encuentra el hueco, la agenda y envía la confirmación por SMS.",
  },
  {
    icon: UsersThreeIcon,
    title: "Conoce la carga de tu equipo",
    description:
      "Te dice quién tiene la agenda llena y quién tiene espacio libre, sin abrir el calendario.",
  },
  {
    icon: ChartLineUpIcon,
    title: "Resume tu negocio",
    description:
      "Citas, confirmaciones y ocupación del día en una frase. Sin abrir reportes ni hojas de cálculo.",
  },
] as const;

export const Route = createFileRoute("/ai")({
  component: AiRoute,
  pendingComponent: LoadingComponent,
  ssr: true,
  head: () => ({
    meta: seo({
      title:
        "Pana IA - El asistente que ya sabe manejar tu barbería | PanaBarbero",
      description:
        "Pana vive en tu dashboard de PanaBarbero: crea citas por chat, te dice cómo va tu equipo y resume tu día con datos reales. Incluido en los planes pagos.",
      canonical: getCanonicalUrl("/ai"),
    }),
    links: [{ rel: "canonical", href: getCanonicalUrl("/ai") }],
    scripts: [softwareApplicationStructuredData()],
  }),
});

function AiRoute() {
  return (
    <BorderContainer>
      <main className="grid grid-cols-1 items-center gap-8 py-6 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-10">
        <section className="space-y-6">
          <h1 className="text-balance font-semibold text-4xl tracking-tighter md:text-5xl">
            Pana, el asistente que ya sabe manejar tu{" "}
            <span className="text-primary">barbería</span>.
          </h1>

          <p className="max-w-md text-pretty text-muted-foreground">
            Pana vive dentro de tu dashboard y conoce tu agenda, tu equipo y tus
            servicios. Pregúntale en español y te responde con tus datos reales,
            no con genéricos.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button nativeButton={false} render={<Link to="/pricing" />}>
              Ver planes con Pana IA
            </Button>
            <Button
              nativeButton={false}
              render={<Link to="/chat" />}
              variant="outline"
            >
              Chatear con Pana
            </Button>
          </div>
        </section>

        <PanaLiveChat />
      </main>

      <Separator className="my-10" />

      <section className="space-y-8">
        <h2 className="text-balance font-semibold text-3xl tracking-tighter md:text-4xl">
          Lo que Pana hace por ti
        </h2>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {CAPABILITIES.map((capability) => {
            const Icon = capability.icon;
            return (
              <li
                key={capability.title}
                className="flex flex-col gap-3 rounded-xl border bg-card p-5"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" weight="bold" />
                </span>
                <h3 className="font-semibold tracking-tight">
                  {capability.title}
                </h3>
                <p className="text-pretty text-muted-foreground text-sm">
                  {capability.description}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <Separator className="my-10" />

      <section className="flex flex-col items-center gap-4 py-4 text-center">
        <h2 className="text-balance font-semibold text-3xl tracking-tighter md:text-4xl">
          Deja que Pana lleve la cuenta.
        </h2>
        <Button nativeButton={false} render={<Link to="/pricing" />} size="lg">
          Ver planes con Pana IA
        </Button>
      </section>

      <Suspense>
        <LandingFooter />
      </Suspense>
    </BorderContainer>
  );
}
