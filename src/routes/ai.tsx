import {
  CalendarCheckIcon,
  ChatCircleIcon,
  CheckCircleIcon,
  CrownIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { PanaDemo } from "@/components/landing/pana-demo";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  getCanonicalUrl,
  seo,
  softwareApplicationStructuredData,
} from "@/lib/utils";

const CtaSection = lazy(() =>
  import("@/components/landing/cta-section").then((module) => ({
    default: module.CtaSection,
  })),
);

const LandingFooter = lazy(() =>
  import("@/components/landing/footer").then((module) => ({
    default: module.LandingFooter,
  })),
);

const STEPS = [
  {
    icon: ChatCircleIcon,
    title: "Escríbele como hablas",
    description:
      "Dile a Pana en lenguaje normal: «un corte mañana por la tarde en La Catedral». Sin formularios ni menús.",
  },
  {
    icon: MagnifyingGlassIcon,
    title: "Pana busca y verifica",
    description:
      "Consulta barberías, servicios, barberos y cupos reales en segundos. Nada inventado: todo sale de la plataforma.",
  },
  {
    icon: CalendarCheckIcon,
    title: "Reserva con un toque",
    description:
      "Apruebas la tarjeta de confirmación y tu cita queda lista. Sin llamadas ni esperas.",
  },
] as const;

const CLIENT_CAPABILITIES = [
  "Buscar barberías por ciudad, nombre o cercanía",
  "Ver servicios, precios, horarios y reseñas",
  "Reservar, cancelar y reagendar por chat",
] as const;

const SHOP_CAPABILITIES = [
  "Consultar y organizar la agenda de tu barbería",
  "Gestionar tu equipo y servicios conversando",
  "Resolver dudas de tu negocio sin salir del chat",
] as const;

export const Route = createFileRoute("/ai")({
  component: AiRoute,
  pendingComponent: LoadingComponent,
  ssr: true,
  head: () => ({
    meta: seo({
      title: "Pana IA - Reserva y gestiona con solo escribir | PanaBarbero",
      description:
        "Pana es el asistente de IA de PanaBarbero. Reserva tu corte en segundos escribiendo en lenguaje normal, y gestiona tu barbería por chat con los planes pagos.",
      canonical: getCanonicalUrl("/ai"),
    }),
    links: [{ rel: "canonical", href: getCanonicalUrl("/ai") }],
    scripts: [softwareApplicationStructuredData()],
  }),
});

function AiRoute() {
  return (
    <BorderContainer>
      <main className="grid grid-cols-1 items-center gap-8 py-6 lg:grid-cols-2 lg:gap-12 lg:py-10">
        <section className="space-y-6">
          <Badge variant="secondary" className="gap-1.5">
            <SparkleIcon weight="fill" className="size-3.5 text-primary" />
            Pana IA
          </Badge>

          <h1 className="text-balance font-semibold text-4xl tracking-tighter md:text-5xl">
            Reserva y gestiona con solo{" "}
            <span className="text-primary">escribir</span>.
          </h1>

          <p className="max-w-md text-pretty text-muted-foreground">
            Pana es tu asistente dentro de PanaBarbero. Encuentra barbería, mira
            disponibilidad y deja tu cita lista en una conversación. Para tu
            barbería, gestiónala por chat con los planes pagos.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button nativeButton={false} render={<Link to="/chat" />}>
              <SparkleIcon weight="fill" className="size-4" />
              Probar a Pana
            </Button>
            <Button
              nativeButton={false}
              render={<Link to="/pricing" />}
              variant="outline"
            >
              Ver planes
            </Button>
          </div>
        </section>

        <PanaDemo />
      </main>

      <Separator className="my-10" />

      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-balance text-center font-semibold text-3xl tracking-tighter md:text-4xl">
            Cómo funciona
          </h2>
          <p className="mx-auto max-w-xl text-pretty text-center text-muted-foreground">
            Tres pasos, una sola conversación. Pana hace el trabajo aburrido por
            ti.
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="flex flex-col gap-3 rounded-xl border bg-card p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" weight="bold" />
                  </span>
                  <span className="font-semibold text-2xl text-muted-foreground/40 tabular-nums">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="font-semibold tracking-tight">{step.title}</h3>
                <p className="text-pretty text-muted-foreground text-sm">
                  {step.description}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <Separator className="my-10" />

      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-balance text-center font-semibold text-3xl tracking-tighter md:text-4xl">
            Qué puede hacer Pana
          </h2>
          <p className="mx-auto max-w-xl text-pretty text-center text-muted-foreground">
            Reservar siempre es gratis. Gestionar tu barbería por chat es un
            beneficio de los planes pagos.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <article className="flex flex-col gap-4 rounded-xl border bg-card p-6">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-lg tracking-tight">
                Para clientes
              </h3>
              <Badge variant="secondary">Gratis para todos</Badge>
            </div>
            <ul className="flex flex-col gap-2.5">
              {CLIENT_CAPABILITIES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircleIcon
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    weight="fill"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="relative flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-6 dark:bg-primary/10">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold text-lg tracking-tight">
                <CrownIcon className="size-5 text-primary" weight="fill" />
                Para tu barbería
              </h3>
              <Badge className="gap-1">
                <LockKeyIcon className="size-3" weight="bold" />
                Premium
              </Badge>
            </div>
            <ul className="flex flex-col gap-2.5">
              {SHOP_CAPABILITIES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircleIcon
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    weight="fill"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <Separator className="my-10" />

      <section className="rounded-2xl border border-primary/20 bg-linear-to-br from-primary/8 via-card to-card p-8 text-center">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CrownIcon className="size-6" weight="fill" />
          </span>
          <h2 className="text-balance font-semibold text-2xl tracking-tighter md:text-3xl">
            Gestiona tu barbería conversando con Pana
          </h2>
          <p className="text-pretty text-muted-foreground">
            Incluido en{" "}
            <span className="font-medium text-foreground">Barbería</span> y{" "}
            <span className="font-medium text-foreground">
              Barbería Profesional
            </span>
            . Lleva tu negocio desde el chat, sin aprender otra herramienta.
          </p>
          <Button nativeButton={false} render={<Link to="/pricing" />}>
            Ver planes
          </Button>
        </div>
      </section>

      <Separator className="my-10" />

      <Suspense>
        <CtaSection />
      </Suspense>

      <Suspense>
        <LandingFooter />
      </Suspense>
    </BorderContainer>
  );
}
