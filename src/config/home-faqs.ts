import { PLAN_LIMITS } from "@convex/plans";

export interface HomeFaq {
  question: string;
  answer: string;
}

/** Free-tier barber cap, so copy can never drift from the enforced limit. */
export const FREE_MAX_BARBERS = PLAN_LIMITS.free.maxInvitedBarbers ?? 0;

/**
 * Single source for the home-page FAQ: feeds both the visible accordion and
 * the FAQPage structured data, so the copy can never drift between the two.
 */
export const HOME_FAQS: HomeFaq[] = [
  {
    question: "¿Qué es PanaBarbero?",
    answer:
      "PanaBarbero es una plataforma colombiana para barberías y clientes. Permite reservar citas en línea, gestionar barberos, servicios e inventario, y enviar notificaciones automáticas por email y SMS para cada evento de la cita.",
  },
  {
    question: "¿Cómo reservan mis clientes?",
    answer:
      "Desde el perfil de tu barbería: eligen barbero, servicio y hora, sin crear cuenta: con nombre y teléfono basta. La cita cae en tu agenda al instante y el cliente recibe la confirmación y los recordatorios automáticamente.",
  },
  {
    question: "¿Cómo funcionan los recordatorios?",
    answer:
      "PanaBarbero envía recordatorios automáticos por SMS y correo antes de cada cita, y te notifica en tiempo real cuando alguien reserva, mueve o cancela.",
  },
  {
    question: "¿Qué es Pana IA?",
    answer:
      "Es el asistente integrado en tu dashboard. Conoce tu agenda, tus servicios y tu equipo; le preguntas en español y responde con tus datos reales. También crea y mueve citas por ti, siempre con tu confirmación. Está incluido en los planes de pago.",
  },
  {
    question: "¿Es gratis usar PanaBarbero?",
    answer: `Sí. El plan gratuito permite invitar hasta ${FREE_MAX_BARBERS} barberos, con agenda y reservas en línea incluidas. Para equipos más grandes, inventario y Pana IA, existen planes de pago con más capacidad.`,
  },
  {
    question: "¿Puedo cambiar de plan en cualquier momento?",
    answer:
      "Sí. Puedes cancelar tu suscripción cuando quieras y suscribirte a otro plan de inmediato. No hay permanencia mínima.",
  },
  {
    question: "¿Cómo pago mi suscripción?",
    answer:
      "Con tarjeta de crédito o débito en un pago seguro procesado por Polar. Los precios están en pesos colombianos y puedes cancelar en cualquier momento.",
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
