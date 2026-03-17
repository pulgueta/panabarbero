export const errorMessages = {
  unauthorized: "No estás autorizado para acceder a esta página",
  appointmentOverlaps: "Hora no disponible. Intenta con una distinta.",
  appointmentOutsideWorkingHours:
    "La barbería no está abierta en el horario seleccionado.",
  appointmentUnavailableHours:
    "La barbería no atiende durante el horario seleccionado.",
  notFound: (resource: string) => `El recurso "${resource}" no fue encontrado`,
  barbershopClosedOnSelectedDay:
    "La barbería no está abierta en el día seleccionado",
  requiredAccount:
    "El usuario debe tener una cuenta en el sistema para ser invitado.",
  rateLimitExceeded: `Has excedido el límite de solicitudes. Intenta después.`,

  // Subscription / ACL
  subscriptionRequired:
    "Necesitas una suscripción activa para acceder a esta función.",
  planLimitExceeded: (feature: string) =>
    `Tu plan no incluye "${feature}". Mejora tu suscripción.`,
  barberLimitExceeded:
    "Has alcanzado el límite de barberos para tu plan actual.",
  staffLimitExceeded:
    "Has alcanzado el límite de personal para tu plan actual.",
  smsLimitExceeded: "Has alcanzado el límite de SMS para este mes.",
  emailLimitExceeded: "Has alcanzado el límite de correos para este mes.",
} as const;
