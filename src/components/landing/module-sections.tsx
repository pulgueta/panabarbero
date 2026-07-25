import type { Icon } from "@phosphor-icons/react";
import {
  CalendarCheckIcon,
  ChatCircleTextIcon,
  CheckCircleIcon,
  CursorClickIcon,
  PackageIcon,
  ScissorsIcon,
  SparkleIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import type { FC, ReactNode } from "react";

import {
  DEMO_APPOINTMENT_STATUS,
  DEMO_INVENTORY,
  DEMO_SERVICES,
  LIVE_STOCK_ITEM_NAME,
  TOGGLED_SERVICE_NAME,
} from "@/components/landing/demo-data";
import {
  CERA_LOW_THRESHOLD,
  CERA_MAX_UNITS,
  currentPanaExchange,
  useLandingSim,
} from "@/components/landing/landing-sim";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ModuleBlock {
  icon: Icon;
  eyebrow: string;
  pro?: boolean;
  title: string;
  description: string;
  bullets: string[];
  demo: ReactNode;
}

const AgendaDemoCard: FC = () => {
  const sim = useLandingSim();

  return (
    <Card size="sm" className="gap-2 p-4">
      {sim.agenda.slice(0, 3).map((apt) => {
        const status = DEMO_APPOINTMENT_STATUS[apt.status];

        return (
          <div
            key={apt.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2",
              apt.entered && "demo-enter",
            )}
          >
            <span className="w-10 shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
              {apt.time}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium text-[13px]">
                {apt.name}
              </span>
              <span className="truncate text-muted-foreground text-xs">
                {apt.service} · {apt.barber}
              </span>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        );
      })}
      <div
        key={sim.reminder.seq}
        className="demo-bubble min-h-16 rounded-xl bg-muted px-3 py-2.5 text-[13px] tabular-nums leading-relaxed"
      >
        {sim.reminder.text}
      </div>
      <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ChatCircleTextIcon className="size-3.5" />
        Recordatorio automático por SMS y correo
      </span>
    </Card>
  );
};

const ServicesDemoCard: FC = () => {
  const sim = useLandingSim();

  return (
    <Card size="sm" className="gap-2 p-4">
      {DEMO_SERVICES.map((service) => {
        const isToggled = service.name === TOGGLED_SERVICE_NAME;
        const active = isToggled ? sim.tinteActive : service.active;

        return (
          <div
            key={service.name}
            className="flex items-center gap-3 rounded-lg border px-3 py-2"
          >
            <service.icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium text-[13px]">
                {service.name}
              </span>
              <span className="text-muted-foreground text-xs">
                {service.duration}
              </span>
            </div>
            <span className="font-medium text-[13px] tabular-nums">
              {service.price}
            </span>
            <Badge
              key={String(active)}
              variant={active ? "secondary" : "outline"}
              className={cn(isToggled && "demo-bubble")}
            >
              {active ? "Activo" : "Pausado"}
            </Badge>
          </div>
        );
      })}
    </Card>
  );
};

const InventoryDemoCard: FC = () => {
  const sim = useLandingSim();

  return (
    <Card size="sm" className="gap-2 p-4">
      {DEMO_INVENTORY.map((item) => {
        const isLive = item.name === LIVE_STOCK_ITEM_NAME;
        const units = isLive ? sim.ceraUnits : item.units;
        const maxUnits = isLive ? CERA_MAX_UNITS : item.maxUnits;
        const low = units <= CERA_LOW_THRESHOLD;
        const percent = Math.min(100, Math.round((units / maxUnits) * 100));

        return (
          <div
            key={item.name}
            className="flex items-center gap-3.5 rounded-lg border p-3"
          >
            <item.icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-medium text-[13px]">
                  {item.name}
                  {isLive && (
                    <Badge
                      key={String(low)}
                      variant={low ? "warning" : "success"}
                      className="demo-bubble"
                    >
                      {low ? "Bajo" : "Repuesto"}
                    </Badge>
                  )}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {units} uds
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width,background-color] duration-500",
                    low ? "bg-warning" : "bg-foreground",
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </Card>
  );
};

const TeamDemoCard: FC = () => {
  const sim = useLandingSim();

  return (
    <Card size="sm" className="gap-2 p-4">
      {sim.team.map((barber) => (
        <div
          key={barber.initials}
          className="flex items-center gap-3.5 rounded-lg border p-3"
        >
          <Avatar>
            <AvatarFallback className="text-xs">
              {barber.initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-[13px]">
              {barber.name}
            </span>
            <span className="text-muted-foreground text-xs">{barber.role}</span>
          </div>
          <span className="hidden text-muted-foreground text-xs tabular-nums sm:inline">
            {barber.citas} citas hoy
          </span>
          <div className="flex w-28 items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-500"
                style={{ width: `${barber.occupancy}%` }}
              />
            </div>
            <span className="w-8 text-right text-muted-foreground text-xs tabular-nums">
              {barber.occupancy}%
            </span>
          </div>
        </div>
      ))}
    </Card>
  );
};

const PanaDemoCard: FC = () => {
  const sim = useLandingSim();
  const exchange = currentPanaExchange(sim);

  return (
    <Card size="sm" className="gap-2.5 p-4">
      <div className="flex min-h-28 flex-col gap-2.5">
        <div
          key={`q-${sim.panaTopic}`}
          className="demo-bubble max-w-[85%] self-end rounded-xl bg-secondary px-3 py-2 text-[13px] text-secondary-foreground"
        >
          {exchange.question}
        </div>
        {sim.panaTyping ? (
          <div className="flex items-center gap-1 self-start rounded-xl border px-3 py-3">
            <span className="demo-typing size-1.5 rounded-full bg-muted-foreground" />
            <span className="demo-typing size-1.5 rounded-full bg-muted-foreground [animation-delay:150ms]" />
            <span className="demo-typing size-1.5 rounded-full bg-muted-foreground [animation-delay:300ms]" />
          </div>
        ) : (
          <div
            key={`a-${sim.panaTopic}`}
            className="demo-bubble max-w-[92%] self-start rounded-xl border px-3 py-2 text-[13px] tabular-nums leading-relaxed"
          >
            {exchange.answer}
          </div>
        )}
      </div>
    </Card>
  );
};

const MODULES: ModuleBlock[] = [
  {
    icon: CalendarCheckIcon,
    eyebrow: "Citas",
    title: "Una agenda que se llena sola.",
    description:
      "Tus clientes reservan desde el perfil de tu barbería, sin crear cuenta: con nombre y teléfono basta. La cita cae en tu agenda al instante, sin cruces de horario.",
    bullets: [
      "Reservas en línea 24/7, incluso con la barbería cerrada.",
      "Estados claros: nueva, sin confirmar, confirmada, completada.",
      "Recordatorios automáticos por SMS y correo antes de cada cita.",
      "Cada cita completada suma a la caja del día, sola.",
    ],
    demo: <AgendaDemoCard />,
  },
  {
    icon: ScissorsIcon,
    eyebrow: "Servicios",
    title: "Tu carta de servicios, con precios claros.",
    description:
      "Define qué ofreces, cuánto cuesta y cuánto tarda. Eso es exactamente lo que ve el cliente antes de reservar, sin sorpresas en la silla.",
    bullets: [
      "Precio y duración por servicio, en pesos colombianos.",
      "Pausa un servicio sin borrarlo y reactívalo cuando quieras.",
      "Cada barbero ofrece sus propios servicios y tarifas.",
    ],
    demo: <ServicesDemoCard />,
  },
  {
    icon: PackageIcon,
    eyebrow: "Inventario",
    title: "El stock se cuenta solo.",
    description:
      "Un corte + barba descuenta cera y aceite sin que nadie anote nada. Tú te enteras antes de que algo se acabe, no después.",
    bullets: [
      "Descuento automático de insumos por cada servicio completado.",
      "Alertas de stock bajo con margen para reponer a tiempo.",
      "Cada movimiento queda en el historial, sin planillas.",
    ],
    demo: <InventoryDemoCard />,
  },
  {
    icon: UsersIcon,
    eyebrow: "Equipo",
    title: "Cada barbero con su agenda y sus números.",
    description:
      "Invita a tu equipo por correo y cada quien maneja su disponibilidad. Tú ves la ocupación y las citas de todos, en una sola pantalla.",
    bullets: [
      "Invitaciones por correo con roles: barbero o asistente.",
      "Disponibilidad y horario propios por barbero.",
      "Los asistentes gestionan la agenda de todo el equipo.",
    ],
    demo: <TeamDemoCard />,
  },
  {
    icon: SparkleIcon,
    eyebrow: "Pana IA",
    pro: true,
    title: "Pregúntale a tu negocio.",
    description:
      "Pana vive dentro del dashboard y conoce tu agenda, tus servicios y tu equipo. Le preguntas en español y responde con tus datos reales, no con genéricos.",
    bullets: [
      "Responde con tu agenda del día, al momento.",
      "Crea y mueve citas por chat; tú confirmas antes de que pase nada.",
      "Gestiona servicios, horarios y equipo sin salir del chat.",
    ],
    demo: <PanaDemoCard />,
  },
];

export const ModuleSections: FC = () => {
  return (
    <section className="flex flex-col gap-12 lg:gap-14">
      <div className="max-w-2xl space-y-2">
        <h2 className="font-semibold text-3xl tracking-tighter md:text-4xl">
          Cada módulo, en detalle.
        </h2>
        <p className="text-pretty text-muted-foreground">
          Lo que viste arriba, pieza por pieza. Todo conectado: una cita
          completada mueve la caja, el inventario y los recordatorios a la vez.
        </p>
      </div>

      {MODULES.map((module, index) => (
        <div
          key={module.eyebrow}
          className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12"
        >
          <div
            className={cn(
              "flex flex-col items-start gap-3.5",
              index % 2 === 1 && "lg:order-last",
            )}
          >
            <span className="flex items-center gap-2 font-semibold text-muted-foreground text-sm">
              <module.icon weight="bold" className="size-4" />
              {module.eyebrow}
              {module.pro && <Badge variant="secondary">Planes de pago</Badge>}
            </span>
            <h3 className="text-balance font-semibold text-2xl tracking-tight">
              {module.title}
            </h3>
            <p className="text-pretty text-muted-foreground leading-relaxed">
              {module.description}
            </p>
            <ul className="space-y-2.5">
              {module.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2.5 text-sm">
                  <CheckCircleIcon
                    weight="bold"
                    className="mt-0.5 size-4 shrink-0 text-success-foreground"
                  />
                  {bullet}
                </li>
              ))}
            </ul>
            <a
              href="#demo"
              className={cn(buttonVariants({ variant: "ghost" }), "mt-1")}
            >
              <CursorClickIcon weight="bold" className="size-4" />
              Verlo en la demo
            </a>
          </div>
          {module.demo}
        </div>
      ))}
    </section>
  );
};
