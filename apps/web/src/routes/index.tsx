import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { BellRing, Clock3, ShieldCheck } from "lucide-react";
import { useLayoutEffect } from "react";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Button } from "@/components/ui/button";
import {
  isBarberQueryOptions,
  useIsBarber,
} from "@/hooks/use-barbershop-members";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  pendingComponent: LoadingComponent,
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      const isBarber = await context.queryClient.ensureQueryData(
        isBarberQueryOptions(user.userId),
      );

      if (isBarber) {
        throw redirect({ to: "/profile/barbershops/appointments" });
      } else {
        throw redirect({ to: "/profile", search: { tab: "account" } });
      }
    }
  },
  ssr: true,
});

function RouteComponent() {
  const navigate = Route.useNavigate();

  const { data: user } = useSession();
  const { data: isBarber } = useIsBarber(user?.userId ?? "");

  useLayoutEffect(() => {
    if (user?.userId) {
      navigate({
        to: isBarber ? "/profile/barbershops/appointments" : "/profile",
        search: { tab: "account" },
        replace: true,
      });
    }
  }, [user?.userId, isBarber, navigate]);

  return (
    <BorderContainer className="min-h-[calc(100dvh-65px)]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="space-y-2">
          <h1 className="text-pretty text-center font-bold text-4xl text-foreground tracking-tighter">
            PanaBarbero
          </h1>
          <p className="text-pretty text-center text-lg text-muted-foreground">
            La solución para las barberías.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-secondary/20 px-4 py-6 md:py-8 lg:py-12">
          <header className="space-y-4 text-center text-primary-foreground">
            <h2 className="text-pretty font-bold text-3xl text-foreground tracking-tighter lg:text-4xl">
              Agenda citas, recibe notificaciones e impulsa tu barbería.
            </h2>
            <p className="text-pretty text-muted-foreground">
              Software para barberos y clientes: agenda inteligente,
              notificaciones automáticas y seguimiento de servicios.
            </p>
          </header>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isBarber ? (
              <Button asChild>
                <Link to="/profile/barbershops/appointments">
                  Ver mis citas
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/appointments/create">Buscar barberías</Link>
              </Button>
            )}

            {!user && (
              <Button variant="outline" asChild>
                <Link to="/login">Crear cuenta gratuita</Link>
              </Button>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 md:p-8">
          <div className="flex w-full flex-col gap-4">
            <div className="w-full space-y-2">
              <h2 className="text-pretty font-bold text-xl tracking-tight">
                Pensado para barberos y clientes.
              </h2>
              <p className="mb-8 text-muted-foreground text-sm md:mb-4">
                Organización total en un solo lugar: menos ausencias, más
                clientes recurrentes y menos tiempo perdido en coordinación
                manual.
              </p>

              <div className="grid w-full gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Recordatorios y avisos",
                    desc: "Notificaciones antes de la cita para que nadie olvide su turno.",
                    icon: <Clock3 className="size-4 text-primary" />,
                  },
                  {
                    title: "Servicios claros",
                    desc: "Precios, duración y barberos disponibles visibles.",
                    icon: <ShieldCheck className="size-4 text-primary" />,
                  },
                  {
                    title: "Disponible en cualquier dispositivo",
                    desc: "Responde y gestiona reservas desde el móvil o escritorio.",
                    icon: <BellRing className="size-4 text-primary" />,
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex gap-4 rounded-lg border border-border/60 bg-secondary/30 p-4"
                  >
                    <div className="mt-1">{item.icon}</div>
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <p className="text-pretty text-muted-foreground text-sm">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 rounded-xl border border-border bg-secondary/20 p-8">
          <h3 className="text-center font-bold text-3xl tracking-tighter">
            ¿Listo para buscar tu nuevo estilo?
          </h3>
          <p className="text-pretty text-center text-lg text-muted-foreground">
            Empieza a buscar tu pana barbero.
          </p>
          <Button asChild>
            <Link
              to="/barbershops"
              search={{ city: undefined, state: undefined }}
            >
              Buscar barberías
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/login">Crear cuenta</Link>
          </Button>
        </div>
      </main>
    </BorderContainer>
  );
}
