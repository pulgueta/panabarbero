import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  MessageSquare,
  Scissors,
  Smartphone,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useLayoutEffect } from "react";

import { LoadingComponent } from "@/components/layout/loading-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  isBarberQueryOptions,
  useIsBarber,
} from "@/hooks/use-barbershop-members";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  pendingComponent: LoadingComponent,
  component: RouteComponent,
  loader: async ({ context }) => {
    let user = null;

    if (context.token) {
      user = await context.queryClient.ensureQueryData(
        getSessionQueryOptions(),
      );
      await context.queryClient.ensureQueryData(getSessionQueryOptions());
    }

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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="-translate-x-1/2 absolute top-0 left-1/2 h-[600px] w-[800px] rounded-full bg-primary/10 opacity-20 blur-3xl" />

        <div className="container relative mx-auto px-4 pt-16 pb-24 md:pt-24 md:pb-32">
          <div className="mx-auto max-w-4xl text-center">
            <Badge
              variant="outline"
              className="mb-6 px-4 py-1.5 font-medium text-xs md:text-sm"
            >
              <Sparkles className="mr-2 size-4 text-primary" />
              La plataforma #1 para barberías en Colombia
            </Badge>

            <h1 className="mb-4 text-balance font-bold text-4xl tracking-tight md:text-5xl">
              Gestiona tu barbería.{" "}
              <span className="bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Sin complicaciones.
              </span>
            </h1>

            <p className="mx-auto mb-8 max-w-2xl text-pretty text-muted-foreground">
              Agenda citas, envía recordatorios automáticos y haz crecer tu
              negocio. Todo lo que necesitas para llevar tu barbería al
              siguiente nivel.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isBarber ? (
                <Button
                  className="group"
                  render={<Link to="/profile/barbershops/appointments" />}
                >
                  Ver mis citas
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              ) : (
                <Button
                  size="default"
                  className="group"
                  render={<Link to="/appointments/create" />}
                >
                  Buscar barberías
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              )}

              {!user && (
                <Button
                  variant="outline"
                  size="default"
                  render={<Link to="/login" />}
                >
                  Crear cuenta gratis
                </Button>
              )}
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-muted-foreground text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span>100% Gratis para empezar</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span>Sin tarjeta de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span>Configuración en minutos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Características
            </Badge>
            <h2 className="mb-4 font-bold text-3xl tracking-tight md:text-4xl">
              Todo lo que tu barbería necesita
            </h2>
            <p className="text-muted-foreground">
              Herramientas poderosas diseñadas específicamente para barberos y
              sus clientes.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Calendar,
                title: "Agenda inteligente",
                description:
                  "Sistema de reservas 24/7. Tus clientes pueden agendar cuando quieran, tú solo te preocupas por cortar.",
              },
              {
                icon: Bell,
                title: "Recordatorios automáticos",
                description:
                  "Notificaciones por email y SMS antes de cada cita. Reduce las ausencias hasta un 80%.",
              },
              {
                icon: Smartphone,
                title: "Acceso desde cualquier lugar",
                description:
                  "Gestiona tu agenda desde el móvil o escritorio. Siempre conectado con tu negocio.",
              },
              {
                icon: Users,
                title: "Gestión de equipo",
                description:
                  "Administra múltiples barberos, sus horarios y servicios desde un solo lugar.",
              },
              {
                icon: TrendingUp,
                title: "Estadísticas y reportes",
                description:
                  "Analiza el rendimiento de tu negocio con métricas claras y accionables.",
              },
              {
                icon: MessageSquare,
                title: "Comunicación directa",
                description:
                  "Mantén contacto con tus clientes. Envía promociones y actualizaciones fácilmente.",
              },
            ].map((feature) => (
              <Card
                key={feature.title}
                className="group relative overflow-hidden border-border/50 bg-linear-to-br transition-all hover:border-primary/30 hover:shadow"
              >
                <CardHeader>
                  <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <feature.icon className="size-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="bg-accent/20 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Cómo funciona
            </Badge>
            <h2 className="mb-4 font-bold text-3xl tracking-tight md:text-4xl">
              Empieza en 3 simples pasos
            </h2>
            <p className="text-muted-foreground">
              Configurar tu barbería en PanaBarbero es rápido y sencillo.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Crea tu cuenta",
                description:
                  "Regístrate gratis en menos de 2 minutos. Sin compromisos, sin tarjeta de crédito.",
                icon: Zap,
              },
              {
                step: "02",
                title: "Configura tu barbería",
                description:
                  "Añade tus servicios, precios, horarios y los barberos de tu equipo.",
                icon: Scissors,
              },
              {
                step: "03",
                title: "¡Recibe reservas!",
                description:
                  "Comparte tu perfil y empieza a recibir citas de clientes nuevos y recurrentes.",
                icon: Star,
              },
            ].map((item, index) => (
              <div
                key={item.step}
                className="relative flex flex-col items-center text-center"
              >
                {/* Connector line */}
                {index < 2 && (
                  <div className="absolute top-12 right-0 hidden h-0.5 w-full translate-x-1/2 bg-primary md:block" />
                )}

                <div className="relative mb-6 flex size-24 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                  <item.icon className="size-10" />
                  <div className="-right-2 -top-2 absolute flex size-8 items-center justify-center rounded-full bg-background font-bold text-primary text-sm shadow">
                    {item.step}
                  </div>
                </div>

                <h3 className="mb-3 font-semibold text-xl">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section - For Barbers vs Clients */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Beneficios
            </Badge>
            <h2 className="mb-4 font-bold text-3xl tracking-tight md:text-4xl">
              Diseñado para todos
            </h2>
            <p className="text-muted-foreground">
              Ya seas barbero o cliente, PanaBarbero tiene algo para ti.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* For Barbers */}
            <Card className="overflow-hidden border-primary/20 bg-linear-to-br from-primary/5 to-transparent pt-0 pb-4">
              <CardHeader className="border-primary/10 border-b bg-primary/5 pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Scissors className="size-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Para Barberos</CardTitle>
                    <CardDescription>
                      Haz crecer tu negocio sin esfuerzo
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {[
                    "Reduce las ausencias con recordatorios automáticos",
                    "Acepta reservas 24/7 sin contestar llamadas",
                    "Organiza tu agenda y la de tu equipo",
                    "Accede a estadísticas de tu negocio",
                    "Comparte tu perfil en redes sociales",
                    "Gestiona servicios y precios fácilmente",
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* For Clients */}
            <Card className="overflow-hidden border-secondary/20 bg-linear-to-br from-secondary/5 to-transparent pt-0 pb-4">
              <CardHeader className="border-secondary/10 border-b bg-secondary/5 pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Users className="size-6" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Para Clientes</CardTitle>
                    <CardDescription>
                      Tu próximo corte a un clic de distancia
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  {[
                    "Encuentra barberías cerca de ti",
                    "Reserva en segundos, sin llamadas",
                    "Recibe recordatorios antes de tu cita",
                    "Conoce precios y servicios por adelantado",
                    "Descubre nuevos estilos y barberos",
                    "Historial de todas tus visitas",
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-secondary" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Preguntas Frecuentes
            </Badge>
            <h2 className="font-bold text-3xl tracking-tight">
              ¿Tienes dudas?
            </h2>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="grid gap-4">
              {[
                {
                  question: "¿PanaBarbero es gratis?",
                  answer:
                    "Sí, puedes empezar a usar PanaBarbero completamente gratis. Ofrecemos un plan básico sin costo que incluye todas las funcionalidades esenciales para gestionar tu barbería.",
                },
                {
                  question: "¿Cómo reciben los clientes los recordatorios?",
                  answer:
                    "Los clientes reciben recordatorios automáticos por email antes de su cita programada. Esto ayuda a reducir significativamente las ausencias.",
                },
                {
                  question: "¿Puedo gestionar varios barberos?",
                  answer:
                    "¡Por supuesto! PanaBarbero permite agregar múltiples barberos a tu equipo, cada uno con su propia agenda, servicios y disponibilidad.",
                },
                {
                  question: "¿Los clientes necesitan crear una cuenta?",
                  answer:
                    "Los clientes pueden crear una cuenta gratuita para poder agendar citas y recibir recordatorios. El proceso toma menos de un minuto.",
                },
                {
                  question: "¿Puedo personalizar mis servicios y precios?",
                  answer:
                    "Totalmente. Puedes crear servicios personalizados con nombre, descripción, duración y precio. Tus clientes verán toda esta información al momento de reservar.",
                },
              ].map((faq) => (
                <Card key={faq.question} className="border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative overflow-hidden py-32">
        {/* Background */}
        <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-primary/5 to-transparent" />
        <div className="absolute right-0 bottom-0 left-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />

        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 font-bold text-3xl tracking-tight md:text-4xl lg:text-5xl">
              ¿Listo para transformar tu barbería?
            </h2>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isBarber ? (
                <Button
                  size="lg"
                  className="group"
                  render={<Link to="/profile/barbershops/appointments" />}
                >
                  Ir a mi agenda
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              ) : (
                <Button
                  size="default"
                  className="group"
                  render={
                    <Link
                      to="/barbershops"
                      search={{ city: undefined, state: undefined }}
                    />
                  }
                >
                  Buscar barberías
                  <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              )}

              {!user && (
                <Button
                  variant="outline"
                  size="default"
                  render={<Link to="/login" />}
                >
                  Registrarme gratis
                </Button>
              )}
            </div>

            <p className="mt-6 text-muted-foreground text-sm">
              Sin tarjeta de crédito, configuración en minutos
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-accent/10 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <p className="font-bold text-xl">PanaBarbero</p>

            <p className="text-center text-muted-foreground text-sm">
              © {new Date().getFullYear()} PanaBarbero. Todos los derechos
              reservados.
            </p>

            <div className="flex gap-6">
              <Link
                to="/barbershops"
                search={{ city: undefined, state: undefined }}
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
              >
                Barberías
              </Link>
              <Link
                to="/appointments/create"
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
              >
                Agendar
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
