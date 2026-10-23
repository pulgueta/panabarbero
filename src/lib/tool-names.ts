const TOOL_NAMES_ES = new Map([
  ["searchBarbershops", "Buscar barberías"],
  ["getBarbershopDetails", "Ver detalles de barbería"],
  ["getBarbershopTeam", "Ver equipo de la barbería"],
  ["listBarbersForService", "Listar barberos"],
  ["getAvailability", "Consultar disponibilidad"],
  ["getMyAppointments", "Ver mis citas"],
  ["getMyProfile", "Consultar perfil"],
  ["getMyNotifications", "Ver notificaciones"],
  ["getBarbershopReviews", "Ver reseñas"],
  ["proposeBooking", "Crear reserva"],
  ["proposeCancellation", "Cancelar cita"],
  ["proposeReschedule", "Reagendar cita"],
]);

export function getToolDisplayName(toolName: string): string {
  return TOOL_NAMES_ES.get(toolName) ?? toolName;
}
