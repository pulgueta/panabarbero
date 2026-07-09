import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Hydrate } from "@tanstack/react-start";
import { visible } from "@tanstack/react-start/hydration";
import { lazy, Suspense } from "react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { clientEnv } from "@/env/client";
import { useSession } from "@/hooks/use-session";
import {
  breadcrumbStructuredData,
  faqStructuredData,
  getCanonicalUrl,
  seo,
  softwareApplicationStructuredData,
} from "@/lib/utils";
import { useLocationStore } from "@/store/barbershop-filters";

const SellingPointsSection = lazy(() =>
  import("@/components/landing/selling-points-section").then((module) => ({
    default: module.SellingPointsSection,
  })),
);

const NotificationsSection = lazy(() =>
  import("@/components/landing/notifications-section").then((module) => ({
    default: module.NotificationsSection,
  })),
);

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

const PricingCards = lazy(() =>
  import("@/components/pricing/pricing-cards").then((module) => ({
    default: module.PricingCards,
  })),
);

const HOME_FAQS = [
  {
    question: "¿Qué es PanaBarbero?",
    answer:
      "PanaBarbero es una plataforma colombiana para barberías y clientes. Permite reservar citas en línea, gestionar barberos y servicios, y enviar notificaciones automáticas por WhatsApp para cada evento de la cita.",
  },
  {
    question: "¿Necesito crear una cuenta para reservar una cita?",
    answer:
      "No. Tus clientes pueden reservar una cita con solo su nombre y número de teléfono, sin necesidad de registrarse. Recibirán notificaciones de su cita de todas formas.",
  },
  {
    question: "¿Cómo registro mi barbería en PanaBarbero?",
    answer:
      "Crea una cuenta gratuita en panabarbero.com, completa el perfil de tu barbería con nombre, dirección, servicios y horarios, e invita a tus barberos. Tu barbería estará visible para los clientes de inmediato.",
  },
  {
    question: "¿Es gratis usar PanaBarbero?",
    answer:
      "Sí. El plan gratuito está disponible para barberías pequeñas con hasta 3 barberos. Para equipos más grandes o funcionalidades avanzadas, existen planes de pago con más capacidad.",
  },
  {
    question: "¿Qué notificaciones reciben los clientes y barberos?",
    answer:
      "Ambos reciben notificaciones automáticas por WhatsApp para: cita agendada, recordatorio antes de la cita, cancelación, solicitud de reagendamiento, confirmación o rechazo del reagendamiento, y citas sin marcar como completadas.",
  },
  {
    question: "¿Puedo agregar más barberos a mi barbería?",
    answer:
      "Sí. Puedes invitar a tu equipo por correo electrónico. Cada barbero tiene su propio panel de citas y los clientes pueden elegir a qué barbero reservarle directamente.",
  },
  {
    question: "¿Los clientes pueden reagendar una cita?",
    answer:
      "Sí. Los clientes pueden solicitar un cambio de fecha y hora. El barbero recibe la solicitud y decide si aceptarla o rechazarla. Ambas partes son notificadas de la decisión.",
  },
  {
    question: "¿En qué ciudades de Colombia está disponible PanaBarbero?",
    answer:
      "PanaBarbero está disponible en todo el territorio colombiano. Puedes buscar barberías por ciudad y departamento desde el directorio de barberías.",
  },
];

export const Route = createFileRoute("/")({
  pendingComponent: LoadingComponent,
  component: RouteComponent,
  ssr: true,
  staleTime: 3600,
  loader: async ({ context }) => {
    if (context.userId) {
      throw redirect({
        to: "/profile",
        search: { tab: "account" },
        replace: true,
      });
    }
  },
  head: () => ({
    meta: [
      ...seo({
        title: "PanaBarbero - Descubre barberías y reserva citas",
        description:
          "Encuentra y reserva citas en barberías de Colombia. Gestiona tu barbería, barberos, servicios y citas con PanaBarbero. Gratis para independientes.",
        canonical: getCanonicalUrl("/"),
      }),
      {
        name: "keywords",
        content:
          "barberías Colombia, reservar cita barbería, gestión barbería, app barbería, PanaBarbero, citas barbero online, barberos Colombia",
      },
      { name: "robots", content: "index, follow" },
      {
        name: "og:image:alt",
        content: "PanaBarbero - La solución para barberías en Colombia",
      },
    ],
    links: [{ rel: "canonical", href: getCanonicalUrl("/") }],
    scripts: [
      softwareApplicationStructuredData(),
      faqStructuredData(HOME_FAQS),
      breadcrumbStructuredData([{ name: "Inicio", url: getCanonicalUrl("/") }]),
    ],
  }),
  headers: () => ({
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  }),
});

function RouteComponent() {
  const persistedState = useLocationStore((s) => s.state);
  const persistedCity = useLocationStore((s) => s.city);
  const { data: user } = useSession();

  return (
    <BorderContainer>
      <main className="grid grid-cols-1 gap-4 py-4 lg:grid-cols-3 lg:items-start">
        <section className="w-full space-y-4 lg:col-span-1 lg:mt-6 lg:max-w-3xl lg:space-y-8">
          <h1 className="text-center font-semibold text-3xl tracking-tighter md:text-balance md:text-4xl lg:text-left lg:text-5xl">
            La solución para las barberías en Colombia.
          </h1>
          <div className="space-y-1 text-center lg:text-left">
            <p className="text-pretty dark:text-muted-foreground">
              <span className="font-semibold">Para clientes: </span>
              Encuentra barberías y reserva citas con tus barberos de confianza.
            </p>
            <p className="text-pretty dark:text-muted-foreground">
              <span className="font-semibold">Para barberos: </span>
              Gestiona tu barbería, clientes y citas de manera fácil y
              eficiente.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Button
              render={
                <Link
                  to={user ? "/profile" : "/login"}
                  search={user ? { tab: "account" } : undefined}
                />
              }
              nativeButton={false}
              className="w-full"
            >
              {user ? "Ir a mi perfil" : "Iniciar sesión"}
            </Button>

            <Button
              render={
                <Link
                  to="/barbershops"
                  search={{ city: persistedCity, state: persistedState }}
                />
              }
              nativeButton={false}
              className="w-full"
              variant="outline"
            >
              Buscar barberías
            </Button>
          </div>
        </section>

        <div className="lg:col-span-2">
          <img
            src={`${clientEnv.VITE_STORAGE_URL}/landing-mobile.webp`}
            alt="PanaBarbero - La solución para las barberías. Imagen de portada."
            className="mask-[linear-gradient(to_bottom,black_65%,transparent)] block rounded-lg md:hidden"
            width={1080}
            height={1920}
            fetchPriority="high"
          />
          <img
            src={`${clientEnv.VITE_STORAGE_URL}/landing-desktop.webp`}
            alt="PanaBarbero - La solución para las barberías. Imagen de portada."
            className="mask-[linear-gradient(to_bottom,black_65%,transparent)] ml-auto hidden w-full max-w-4xl rounded-lg [-webkit-mask-image:linear-gradient(to_bottom,black_65%,transparent)] md:block"
            width={1920}
            height={1280}
            fetchPriority="high"
          />
        </div>
      </main>

      <Separator className="my-8" />

      <section>
        <div className="space-y-4">
          <h2 className="text-balance text-center font-semibold text-3xl tracking-tighter md:text-left">
            Gestiona barberos y servicios desde un solo lugar.
          </h2>
          <p className="text-pretty text-center md:text-left dark:text-muted-foreground">
            Agrega a tu equipo, define los servicios que ofreces con sus precios
            y deja que tus clientes reserven directamente. Todo organizado, sin
            complicaciones.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <img
                src={`${clientEnv.VITE_STORAGE_URL}/barbers-mobile.webp`}
                alt="Gestión de barberos en PanaBarbero."
                className="mask-[linear-gradient(to_bottom,black_70%,transparent)] block rounded-lg md:hidden"
                width={1080}
                height={1920}
                loading="lazy"
              />
              <img
                src={`${clientEnv.VITE_STORAGE_URL}/barbers-desktop.webp`}
                alt="Gestión de barberos en PanaBarbero."
                className="mask-[linear-gradient(to_bottom,black_70%,transparent)] hidden w-full rounded-lg [-webkit-mask-image:linear-gradient(to_bottom,black_70%,transparent)] md:block"
                width={1920}
                height={1080}
                loading="lazy"
              />
              <p className="text-center font-medium text-muted-foreground text-sm">
                Panel de barberos
              </p>
            </div>
            <div className="space-y-2">
              <img
                src={`${clientEnv.VITE_STORAGE_URL}/services-mobile.webp`}
                alt="Gestión de servicios en PanaBarbero."
                className="mask-[linear-gradient(to_bottom,black_70%,transparent)] block rounded-lg md:hidden"
                width={1080}
                height={1920}
                loading="lazy"
              />
              <img
                src={`${clientEnv.VITE_STORAGE_URL}/services-desktop.webp`}
                alt="Gestión de servicios en PanaBarbero."
                className="mask-[linear-gradient(to_bottom,black_70%,transparent)] hidden w-full rounded-lg [-webkit-mask-image:linear-gradient(to_bottom,black_70%,transparent)] md:block"
                width={1920}
                height={1080}
                loading="lazy"
              />
              <p className="text-center font-medium text-muted-foreground text-sm">
                Panel de servicios
              </p>
            </div>
          </div>
        </div>
      </section>

      <Separator className="my-8" />

      <section>
        <div className="space-y-4">
          <h2 className="text-balance text-center font-semibold text-3xl tracking-tighter md:text-left">
            Un sistema de citas que trabaja por ti.
          </h2>
          <p className="text-pretty text-center md:text-left dark:text-muted-foreground">
            Tus clientes reservan en segundos. Tú recibes la cita y la gestionas
            desde tu panel. Así de simple.
          </p>

          <img
            src={`${clientEnv.VITE_STORAGE_URL}/system-mobile.webp`}
            alt="Sistema de citas de PanaBarbero."
            className="mask-[linear-gradient(to_bottom,black_65%,transparent)] block rounded-lg md:hidden"
            width={1080}
            height={1620}
            loading="lazy"
          />
          <img
            src={`${clientEnv.VITE_STORAGE_URL}/system-desktop.webp`}
            alt="Sistema de citas de PanaBarbero."
            className="mask-[linear-gradient(to_bottom,black_65%,transparent)] ml-auto hidden w-full rounded-lg [-webkit-mask-image:linear-gradient(to_bottom,black_65%,transparent)] md:block"
            width={1920}
            height={1280}
            loading="lazy"
          />
        </div>
      </section>

      <Separator className="my-8" />

      <Suspense>
        <NotificationsSection />
      </Suspense>

      <Separator className="my-8" />

      <Suspense>
        <SellingPointsSection />
      </Suspense>

      <Separator className="my-8" />

      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-balance text-center font-semibold text-3xl tracking-tighter md:text-4xl">
            Precios
          </h2>
          <p className="text-pretty text-center dark:text-muted-foreground">
            Puedes operar gratuitamente de forma independiente o suscribirte a
            uno de nuestros planes para acceder a más funcionalidades.
          </p>
        </div>

        <Hydrate
          when={visible({ rootMargin: "200px" })}
          fallback={<ProfileTabSkeleton />}
        >
          <PricingCards />
        </Hydrate>
      </section>

      <Separator className="my-8" />

      <Hydrate when={visible({ rootMargin: "200px" })}>
        <CtaSection />
      </Hydrate>

      <Suspense>
        <LandingFooter />
      </Suspense>
    </BorderContainer>
  );
}
