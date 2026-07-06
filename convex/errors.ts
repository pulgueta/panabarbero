export const errorMessages = {
  unauthorized: "No estás autorizado para acceder a esta página",
  appointmentOverlaps: "Hora no disponible. Intenta con una distinta.",
  appointmentOutsideWorkingHours:
    "La barbería no está abierta en el horario seleccionado.",
  appointmentUnavailableHours:
    "La barbería no atiende durante el horario seleccionado.",
  cannotRescheduleCompleted:
    "No puedes reprogramar una cita que ya fue completada.",
  notFound: (resource: string) => `El recurso "${resource}" no fue encontrado`,
  barbershopClosedOnSelectedDay:
    "La barbería no está abierta en el día seleccionado",
  barbershopAlreadyExists: "Ya tienes una barbería registrada.",
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
  invalidPhoneNumber: "El número de teléfono no es válido.",

  // Reviews
  reviewInvalidCode: "El enlace de reseña no es válido o ya fue utilizado.",
  reviewAlreadyExists: "Ya dejaste una reseña para esta visita.",
  reviewNotCompleted:
    "Solo puedes reseñar una visita que haya sido completada.",
  reviewImmutable:
    "Una reseña publicada no se puede modificar; solo eliminarla.",

  // Inventory
  insufficientStock: "No hay stock suficiente para completar esta operación.",
  itemArchived: "Este producto está archivado.",
  itemNotSellable: "Este producto no está marcado para la venta.",
  invalidQuantity: "La cantidad debe ser mayor a 0.",
  idempotencyKeyConflict:
    "Esta clave de idempotencia ya se usó en otra operación.",
  salePriceRequired:
    "El precio de venta es requerido para productos vendibles.",
  duplicateRecipeItem: "No repitas productos en la receta.",
  durableNotConsumable:
    "Los productos durables no se consumen, no se venden ni se marcan como merma. Usa un ajuste para corregir su cantidad.",
} as const;
