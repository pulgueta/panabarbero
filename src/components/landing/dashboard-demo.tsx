import type { Icon } from "@phosphor-icons/react";
import {
  BellIcon,
  CalendarCheckIcon,
  CaretRightIcon,
  CursorIcon,
  GearIcon,
  PackageIcon,
  PaperPlaneRightIcon,
  PlusIcon,
  ScissorsIcon,
  SidebarSimpleIcon,
  SparkleIcon,
  UserPlusIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import type { FC } from "react";
import { useEffect, useRef } from "react";

import {
  DEMO_APPOINTMENT_STATUS,
  DEMO_INVENTORY,
  DEMO_SERVICES,
  LIVE_STOCK_ITEM_NAME,
  TOGGLED_SERVICE_NAME,
} from "@/components/landing/demo-data";
import type {
  DashSection,
  LandingSimState,
} from "@/components/landing/landing-sim";
import {
  CERA_LOW_THRESHOLD,
  CERA_MAX_UNITS,
  currentPanaExchange,
  formatCop,
  panaExchanges,
  pendingCount,
  registerLandingSimDashboard,
  useLandingSim,
} from "@/components/landing/landing-sim";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface DemoNavItem {
  id: DashSection | "ajustes";
  icon: Icon;
  label: string;
}

const NAV_GROUPS: { label: string; items: DemoNavItem[] }[] = [
  {
    label: "Operación",
    items: [
      { id: "citas", icon: CalendarCheckIcon, label: "Citas" },
      { id: "servicios", icon: ScissorsIcon, label: "Servicios" },
      { id: "inventario", icon: PackageIcon, label: "Inventario" },
    ],
  },
  {
    label: "Barbería",
    items: [
      { id: "equipo", icon: UsersIcon, label: "Equipo" },
      { id: "ajustes", icon: GearIcon, label: "Ajustes" },
    ],
  },
  {
    label: "Asistente",
    items: [{ id: "pana", icon: SparkleIcon, label: "Pana" }],
  },
];

const SECTION_CRUMBS: Record<DashSection, string> = {
  citas: "Citas",
  servicios: "Servicios",
  inventario: "Inventario",
  equipo: "Equipo",
  pana: "Pana",
};

const SectionHeader: FC<{
  title: string;
  description: string;
  action?: { icon: Icon; label: string; tour?: string };
}> = ({ title, description, action }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold text-sm tracking-tight">{title}</span>
      <span className="text-muted-foreground text-xs">{description}</span>
    </div>
    {action && (
      <span
        data-tour={action.tour}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <action.icon className="size-3" />
        {action.label}
      </span>
    )}
  </div>
);

const CitasView: FC<{ sim: LandingSimState }> = ({ sim }) => {
  const kpis = [
    { label: "Citas hoy", value: String(sim.citasHoy) },
    { label: "Caja del día", value: formatCop(sim.caja) },
    { label: "Sin confirmar", value: String(pendingCount(sim)) },
    { label: "Ocupación", value: `${sim.ocupacion}%` },
  ];
  const confirmTargetId = sim.agenda.find(
    (apt) => apt.status !== "confirmada",
  )?.id;

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="flex flex-col gap-0.5 rounded-lg border px-3 py-2.5"
          >
            <span className="text-[11px] text-muted-foreground">
              {kpi.label}
            </span>
            <span className="font-semibold text-xl tabular-nums tracking-tight">
              {kpi.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm tracking-tight">
          Agenda de hoy
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {sim.agenda.map((apt) => {
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
              <span className="hidden text-[13px] text-muted-foreground tabular-nums sm:inline">
                {formatCop(apt.price)}
              </span>
              <Badge variant={status.variant}>{status.label}</Badge>
              <span
                data-tour={
                  apt.id === confirmTargetId ? "apt-confirm" : undefined
                }
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "hidden sm:inline-flex",
                )}
              >
                {apt.status === "confirmada" ? "Mover" : "Confirmar"}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
};

const ServiciosView: FC<{ sim: LandingSimState }> = ({ sim }) => (
  <>
    <SectionHeader
      title="Servicios"
      description="Precios y duración que ven tus clientes al reservar."
      action={{ icon: PlusIcon, label: "Nuevo servicio" }}
    />
    <div className="flex flex-col gap-2">
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
            <span data-tour={isToggled ? "svc-switch" : undefined}>
              <Switch size="sm" checked={active} aria-hidden />
            </span>
          </div>
        );
      })}
    </div>
  </>
);

const InventarioView: FC<{ sim: LandingSimState }> = ({ sim }) => (
  <>
    <SectionHeader
      title="Inventario"
      description="El stock se descuenta solo con cada servicio completado."
      action={{ icon: PlusIcon, label: "Nuevo producto" }}
    />
    <div className="flex flex-col gap-2">
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
                    "h-full rounded-full transition-all duration-500",
                    low ? "bg-warning" : "bg-foreground",
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
            {isLive && (
              <span
                data-tour="inv-reponer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                Reponer
              </span>
            )}
          </div>
        );
      })}
    </div>
  </>
);

const EquipoView: FC<{ sim: LandingSimState }> = ({ sim }) => (
  <>
    <SectionHeader
      title="Equipo"
      description="Cada barbero con su agenda, su disponibilidad y sus números."
      action={{
        icon: UserPlusIcon,
        label: "Invitar barbero",
        tour: "team-invite",
      }}
    />
    <div className="flex flex-col gap-2">
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
                className="h-full rounded-full bg-foreground transition-all duration-500"
                style={{ width: `${barber.occupancy}%` }}
              />
            </div>
            <span className="w-8 text-right text-muted-foreground text-xs tabular-nums">
              {barber.occupancy}%
            </span>
          </div>
        </div>
      ))}
    </div>
  </>
);

const PanaView: FC<{ sim: LandingSimState }> = ({ sim }) => {
  const exchange = currentPanaExchange(sim);
  const nextTopic = (sim.panaTopic + 1) % 3;

  return (
    <>
      <div className="flex items-center gap-2.5">
        <Avatar>
          <AvatarFallback className="text-xs">PA</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-[13px]">Pana</span>
          <span className="text-[11px] text-muted-foreground">
            Conectado a tu barbería
          </span>
        </div>
        <Badge variant="success" className="ml-auto">
          En línea
        </Badge>
      </div>
      <div className="flex min-h-32 flex-1 flex-col gap-2.5 pt-1">
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
      <div className="flex flex-wrap gap-1.5">
        {panaExchanges(sim).map((topic, index) => (
          <span
            key={topic.question}
            data-tour={index === nextTopic ? "pana-chip" : undefined}
            className={cn(
              buttonVariants({
                variant: index === sim.panaTopic ? "secondary" : "outline",
                size: "sm",
              }),
            )}
          >
            {topic.question}
          </span>
        ))}
      </div>
      <div className="flex gap-2 border-t pt-3">
        <span className="flex h-9 flex-1 items-center rounded-lg border bg-transparent px-3 text-[13px] text-muted-foreground">
          Escríbele a Pana…
        </span>
        <span
          className={cn(buttonVariants({ variant: "contrast", size: "icon" }))}
        >
          <PaperPlaneRightIcon className="size-4" />
        </span>
      </div>
    </>
  );
};

/**
 * Live replica of the real dashboard for the landing hero. A scripted cursor
 * tours the UI performing actions (confirming citas, restocking, toggling
 * services, asking Pana) driven by the shared simulation in `landing-sim.ts`.
 * Everything is decorative — sized containers never change, and the block is
 * exposed as a single image to assistive tech.
 */
export const DashboardDemo: FC = () => {
  const sim = useLandingSim();
  const dashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dashRef.current) {
      return;
    }
    return registerLandingSimDashboard(dashRef.current);
  }, []);

  return (
    <section className="scroll-mt-24 space-y-3" id="demo">
      <div
        ref={dashRef}
        role="img"
        aria-label="Demostración del panel de PanaBarbero: la agenda del día, la caja, el inventario y el equipo de Barbería El Pana actualizándose en vivo"
        className="pointer-events-none relative flex h-[600px] select-none overflow-hidden rounded-2xl border bg-sidebar text-sidebar-foreground md:h-[520px]"
      >
        <aside className="hidden w-56 shrink-0 flex-col gap-5 p-4 lg:flex">
          <div className="flex items-center gap-2 px-1">
            <Avatar size="sm" className="size-7">
              <AvatarFallback className="text-[11px]">EP</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="whitespace-nowrap font-semibold text-[13px]">
                Barbería El Pana
              </span>
              <span className="text-[11px] text-muted-foreground">
                Plan Barbería · Bogotá
              </span>
            </div>
          </div>

          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <span className="px-2.5 pb-1 font-medium text-[11px] text-muted-foreground">
                {group.label}
              </span>
              {group.items.map((item) => {
                const active = item.id === sim.section;

                return (
                  <span
                    key={item.id}
                    data-tour={`nav-${item.id}`}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-lg px-2.5 font-medium text-[13px] transition-colors",
                      active
                        ? "bg-sidebar-accent font-semibold text-sidebar-primary"
                        : "text-sidebar-foreground",
                    )}
                  >
                    <item.icon
                      weight={active ? "fill" : "bold"}
                      className="size-4"
                    />
                    {item.label}
                  </span>
                );
              })}
            </div>
          ))}

          <div className="mt-auto flex items-center gap-2 border-sidebar-border border-t px-1 pt-3">
            <Avatar size="sm" className="size-7">
              <AvatarFallback className="text-[10px]">NR</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col">
              <span className="font-medium text-xs">Nelson Rojas</span>
              <span className="text-[10.5px] text-muted-foreground">Dueño</span>
            </div>
          </div>
        </aside>

        <div className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground lg:ml-0">
          <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarSimpleIcon className="size-4 text-muted-foreground" />
            <span className="h-4 w-px bg-border" />
            <span className="text-[13px] text-muted-foreground">Panel</span>
            <CaretRightIcon className="size-2.5 text-muted-foreground" />
            <span className="font-medium text-[13px]">
              {SECTION_CRUMBS[sim.section]}
            </span>
            <span className="ml-auto flex items-center gap-3">
              <BellIcon className="size-4 text-muted-foreground" />
              <span
                data-tour="crear-cita"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                <PlusIcon className="size-3" />
                Crear cita
              </span>
            </span>
          </div>

          <div
            key={sim.section}
            className="demo-fade flex flex-1 flex-col gap-3.5 overflow-hidden p-4"
          >
            {sim.section === "citas" && <CitasView sim={sim} />}
            {sim.section === "servicios" && <ServiciosView sim={sim} />}
            {sim.section === "inventario" && <InventarioView sim={sim} />}
            {sim.section === "equipo" && <EquipoView sim={sim} />}
            {sim.section === "pana" && <PanaView sim={sim} />}
          </div>
        </div>

        <div
          aria-hidden
          className="absolute top-0 left-0 z-20 hidden lg:block"
          style={{
            transform: `translate(${sim.cursor.x}px, ${sim.cursor.y}px)`,
            opacity: sim.cursor.moved ? 1 : 0,
            transition:
              "transform 1.15s cubic-bezier(0.5, 0.05, 0.3, 1), opacity 0.3s",
          }}
        >
          {sim.cursor.clickSeq > 0 && (
            <span
              key={sim.cursor.clickSeq}
              className="demo-click absolute -top-2 -left-2 size-6 rounded-full bg-primary/35"
            />
          )}
          <CursorIcon
            weight="fill"
            className="size-5 text-foreground drop-shadow-sm"
          />
        </div>
      </div>
    </section>
  );
};
