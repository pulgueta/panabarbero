export const errorMessages = {
  unauthorized: "No estás autorizado para acceder a esta página",
  appointmentOverlaps:
    "La reserva se cruza con otra. Intenta con una hora o fecha distinta.",
  appointmentOutsideWorkingHours:
    "La barbería no está abierta en el horario seleccionado.",
  notFound: (resource: string) => `El recurso "${resource}" no fue encontrado`,
  barbershopClosedOnSelectedDay:
    "La barbería no está abierta en el día seleccionado",
} as const;

export type ErrorMessage = keyof typeof errorMessages;
