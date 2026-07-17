import {
  BellIcon,
  CalendarCheckIcon,
  CalendarXIcon,
  ChatTextIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  EnvelopeSimpleIcon,
  UserPlusIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import {
  AnimatePresence,
  animate,
  domAnimation,
  LazyMotion,
  m,
  useInView,
  useMotionValue,
  useTransform,
} from "motion/react";
import type { FC, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";

interface NotificationItem {
  icon: ReactNode;
  subject: string;
  description: string;
  channel: "email" | "sms" | "ambos";
  color: string;
}

export const notifications: NotificationItem[] = [
  {
    icon: <CalendarCheckIcon weight="bold" className="size-4" />,
    subject: "Cita agendada",
    description: "Tu cita ha sido confirmada exitosamente",
    channel: "ambos",
    color: "text-emerald-400",
  },
  {
    icon: <BellIcon weight="bold" className="size-4" />,
    subject: "Recordatorio de cita",
    description: "Tu cita es en ~30 minutos",
    channel: "ambos",
    color: "text-amber-400",
  },
  {
    icon: <CalendarXIcon weight="bold" className="size-4" />,
    subject: "Cita cancelada",
    description: "La cita ha sido cancelada por el barbero",
    channel: "ambos",
    color: "text-red-400",
  },
  {
    icon: <ClockCounterClockwiseIcon weight="bold" className="size-4" />,
    subject: "Solicitud de reagendamiento",
    description: "Tu barbero quiere reagendar la cita",
    channel: "email",
    color: "text-blue-400",
  },
  {
    icon: <CheckCircleIcon weight="bold" className="size-4" />,
    subject: "Reagendamiento aceptado",
    description: "El cambio de fecha fue aceptado",
    channel: "ambos",
    color: "text-emerald-400",
  },
  {
    icon: <XCircleIcon weight="bold" className="size-4" />,
    subject: "Reagendamiento rechazado",
    description: "La solicitud de reagendamiento fue rechazada",
    channel: "sms",
    color: "text-red-400",
  },
  {
    icon: <UserPlusIcon weight="bold" className="size-4" />,
    subject: "Invitación a la barbería",
    description: "Has sido invitado a unirte a la barbería",
    channel: "email",
    color: "text-violet-400",
  },
];

export const channelConfig = {
  email: {
    label: "Email",
    icon: <EnvelopeSimpleIcon weight="bold" className="size-3" />,
  },
  sms: {
    label: "SMS",
    icon: <ChatTextIcon weight="bold" className="size-3" />,
  },
  ambos: {
    label: "Email + SMS",
    icon: <BellIcon weight="bold" className="size-3" />,
  },
};

export const notificationFeatures = [
  {
    icon: <EnvelopeSimpleIcon weight="bold" className="size-5" />,
    title: "Correo electrónico",
    desc: "Notificaciones detalladas con toda la información de la cita.",
  },
  {
    icon: <ChatTextIcon weight="bold" className="size-5" />,
    title: "Mensajes SMS",
    desc: "Alertas directas al celular para recordatorios urgentes.",
  },
  {
    icon: <BellIcon weight="bold" className="size-5" />,
    title: "Multicanal",
    desc: "Configura qué notificaciones recibir y por cuál canal.",
  },
];

function AnimatedCounter({ target }: { target: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      animate(count, target, { duration: 2, ease: "easeOut" });
    }
  }, [isInView, count, target]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent = v.toLocaleString("es-CO");
      }
    });
    return unsubscribe;
  }, [rounded]);

  return <span ref={ref}>0</span>;
}

const NotificationCard: FC<{
  notification: NotificationItem;
  index: number;
}> = ({ notification, index }) => {
  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, x: 60, filter: "blur(8px)" }}
        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, x: -30, filter: "blur(4px)" }}
        transition={{
          duration: 0.5,
          delay: index * 0.12,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        className="group flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 backdrop-blur-sm transition-colors hover:bg-muted/50"
      >
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-md bg-muted ${notification.color}`}
        >
          {notification.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-foreground text-sm">
              {notification.subject}
            </span>
          </div>
          <p className="truncate text-muted-foreground text-xs">
            {notification.description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-1 text-muted-foreground text-xs">
          {channelConfig[notification.channel].icon}
          <span>{channelConfig[notification.channel].label}</span>
        </div>
      </m.div>
    </LazyMotion>
  );
};

export const NotificationsSection: FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current > notifications.length) {
        clearInterval(interval);
        return;
      }
      setVisibleCount(current);
    }, 400);

    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <section ref={sectionRef} className="space-y-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-16">
        <div className="flex flex-col justify-center gap-y-4">
          <div className="space-y-4">
            <h2 className="font-semibold text-3xl tracking-tighter md:text-4xl">
              Notificaciones{" "}
              <span className="text-primary">en tiempo real</span>
            </h2>
            <p className="text-pretty text-muted-foreground leading-relaxed">
              Cada evento de tus citas genera una notificación automática. Desde
              la creación hasta la cancelación, tanto tú como tus clientes
              estarán siempre informados.
            </p>
          </div>

          <div className="space-y-4">
            {notificationFeatures.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/50 p-4"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {feature.icon}
                </div>
                <div>
                  <p className="font-medium text-sm">{feature.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-145 overflow-hidden rounded-xl border border-border bg-card p-2 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent" />

          <div className="relative flex items-center gap-2 border-border border-b p-4">
            <div className="flex size-6 items-center justify-center rounded-md bg-primary/20 text-primary">
              <BellIcon weight="bold" className="size-3.5" />
            </div>
            <span className="font-medium text-muted-foreground text-sm">
              Notificaciones
            </span>
            <Badge
              variant="default"
              className="ml-auto bg-primary/20 text-primary text-xs"
            >
              <AnimatedCounter target={notifications.length} /> nuevas
            </Badge>
          </div>

          <div className="relative space-y-2 p-4">
            <AnimatePresence mode="popLayout">
              {notifications.slice(0, visibleCount).map((n, i) => (
                <NotificationCard key={n.subject} notification={n} index={i} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
