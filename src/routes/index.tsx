import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { env } from "@/env";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";
import { getCanonicalUrl, seo } from "@/lib/utils";
import { useLocationStore } from "@/store/barbershop-filters";

const PricingCards = lazy(() =>
  import("@/components/pricing/pricing-cards").then((module) => ({
    default: module.PricingCards,
  })),
);

export const Route = createFileRoute("/")({
  pendingComponent: LoadingComponent,
  component: RouteComponent,
  head: () => ({
    meta: seo({
      title: "PanaBarbero - Descubre barberías y reserva citas",
      description:
        "Encuentra barberías, reserva citas y gestiona tu barbería con PanaBarbero. La solución completa para barberías.",
      canonical: getCanonicalUrl("/"),
    }),
    links: [{ rel: "canonical", href: getCanonicalUrl("/") }],
    // scripts: [
    //   faqStructuredData(HOME_FAQS),
    //   breadcrumbStructuredData([{ name: "Inicio", url: getCanonicalUrl("/") }]),
    // ],
  }),
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      throw redirect({
        to: "/profile",
        search: { tab: "account" },
        replace: true,
      });
    }
  },
  ssr: true,
});

function RouteComponent() {
  const persistedState = useLocationStore((s) => s.state);
  const persistedCity = useLocationStore((s) => s.city);
  const { data: user } = useSession();

  return (
    <BorderContainer>
      <main className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start lg:py-4">
        <section className="w-full space-y-4 lg:col-span-1 lg:mt-6 lg:max-w-3xl lg:space-y-8">
          <h1 className="text-center font-bold text-3xl tracking-tighter md:text-balance md:text-4xl lg:text-left">
            La solución para las barberías en Colombia.
          </h1>
          <div className="space-y-1 text-center lg:text-left">
            <p className="text-pretty dark:text-muted-foreground">
              <span className="font-bold">Para clientes: </span>
              Encuentra barberías y reserva citas con tus barberos de confianza.
            </p>
            <p className="text-pretty dark:text-muted-foreground">
              <span className="font-bold">Para barberos: </span>
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
            src={`${env.VITE_STORAGE_URL}/landing-mobile.webp`}
            alt="PanaBarbero - La solución para las barberías. Imagen de portada."
            className="mask-[linear-gradient(to_bottom,black_65%,transparent)] block rounded-lg md:hidden"
            fetchPriority="high"
          />
          <img
            src={`${env.VITE_STORAGE_URL}/landing-desktop.webp`}
            alt="PanaBarbero - La solución para las barberías. Imagen de portada."
            className="mask-[linear-gradient(to_bottom,black_65%,transparent)] ml-auto hidden w-full max-w-4xl rounded-lg [-webkit-mask-image:linear-gradient(to_bottom,black_65%,transparent)] md:block"
            fetchPriority="high"
          />
        </div>
      </main>

      <Separator className="my-8" />

      <section>
        <div className="space-y-4">
          <h2 className="text-balance text-center font-bold text-3xl tracking-tighter md:text-left">
            Un sistema para organizar tu barbería.
          </h2>
          <p className="text-pretty text-center md:text-left dark:text-muted-foreground">
            Recibe citas de tus clientes, gestiona tus barberos y servicios, y
            mucho más.
          </p>
          <p className="text-pretty text-center md:text-left dark:text-muted-foreground">
            En PanaBarbero recibes notificaciones de todos los eventos de tus
            citas. Siempre estarás notificado de cualquier acción al igual que
            tus clientes.
          </p>

          <img
            src={`${env.VITE_STORAGE_URL}/system-mobile.webp`}
            alt="PanaBarbero - La solución para las barberías. Imagen de portada."
            className="mask-[linear-gradient(to_bottom,black_65%,transparent)] block rounded-lg md:hidden"
            fetchPriority="high"
          />
          <img
            src={`${env.VITE_STORAGE_URL}/system-desktop.webp`}
            alt="PanaBarbero - La solución para las barberías. Imagen de portada."
            className="mask-[linear-gradient(to_bottom,black_65%,transparent)] ml-auto hidden w-full rounded-lg [-webkit-mask-image:linear-gradient(to_bottom,black_65%,transparent)] md:block"
            fetchPriority="high"
          />
        </div>
      </section>

      <Separator className="my-8" />

      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-balance text-center font-bold text-3xl tracking-tighter md:text-4xl">
            Precios
          </h2>
          <p className="text-pretty text-center md:text-left dark:text-muted-foreground">
            Puedes operar gratuitamente de forma independiente o suscribirte a
            uno de nuestros planes para acceder a más funcionalidades.
          </p>
        </div>

        <Suspense fallback={<ProfileTabSkeleton />}>
          <PricingCards />
        </Suspense>
      </section>
    </BorderContainer>
  );
}
