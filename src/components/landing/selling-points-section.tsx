import {
  CalendarDotsIcon,
  ChatsIcon,
  DeviceMobileIcon,
  ScissorsIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import type { FC, ReactNode } from "react";

interface SellingPoint {
  icon: ReactNode;
  title: string;
  description: string;
}

const sellingPoints: SellingPoint[] = [
  {
    icon: <CalendarDotsIcon weight="bold" className="size-5" />,
    title: "Reagendamiento flexible",
    description:
      "Tus clientes pueden solicitar cambios de fecha. Tú decides si aceptas o rechazas desde tu panel.",
  },
  {
    icon: <UsersThreeIcon weight="bold" className="size-5" />,
    title: "Invita a tu equipo",
    description:
      "Agrega barberos y staff a tu barbería con roles personalizados. Cada uno gestiona sus propias citas.",
  },
  {
    icon: <DeviceMobileIcon weight="bold" className="size-5" />,
    title: "Reservas sin cuenta",
    description:
      "Tus clientes pueden agendar con solo su nombre y teléfono. Sin registros, sin fricción.",
  },
  {
    icon: <ScissorsIcon weight="bold" className="size-5" />,
    title: "Servicios y precios",
    description:
      "Define tus cortes, tratamientos y precios. Tus clientes ven todo antes de reservar.",
  },
  {
    icon: <ShieldCheckIcon weight="bold" className="size-5" />,
    title: "Control total",
    description:
      "Configura horarios, periodos de gracia, y preferencias de notificación a tu medida.",
  },
  {
    icon: <ChatsIcon weight="bold" className="size-5" />,
    title: "Comunicación directa",
    description:
      "Email y SMS automáticos para cada evento. Tu cliente siempre sabe qué pasa con su cita.",
  },
];

export const SellingPointsSection: FC = () => {
  return (
    <section className="space-y-6 py-4">
      <div className="space-y-2">
        <h2 className="text-balance text-center font-bold text-3xl tracking-tighter md:text-4xl">
          Todo lo que tu barbería necesita
        </h2>
        <p className="text-pretty text-center dark:text-muted-foreground">
          Herramientas diseñadas para que te enfoques en lo que mejor haces:
          cortar cabello.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sellingPoints.map((point) => (
          <div
            key={point.title}
            className="group flex gap-3 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:bg-card/80"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
              {point.icon}
            </div>
            <div className="space-y-1">
              <p className="font-semibold leading-tight">{point.title}</p>
              <p className="text-pretty text-muted-foreground text-sm leading-relaxed">
                {point.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
