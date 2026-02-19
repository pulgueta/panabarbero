export const errorMessages = {
  unauthorized: "No estás autorizado para acceder a esta página",
  appointmentOverlaps:
    "La reserva se cruza con otra. Intenta con una hora o fecha distinta.",
  appointmentOutsideWorkingHours:
    "La barbería no está abierta en el horario seleccionado.",
  appointmentUnavailableHours:
    "La barbería no atiende durante el horario seleccionado.",
  notFound: (resource: string) => `El recurso "${resource}" no fue encontrado`,
  barbershopClosedOnSelectedDay:
    "La barbería no está abierta en el día seleccionado",
  requiredAccount:
    "El usuario debe tener una cuenta en el sistema para ser invitado.",
  rateLimitExceeded: (retryAfter: string) =>
    `Has excedido el límite de solicitudes. Intenta nuevamente a las: ${retryAfter}`,
} as const;
