// Utility functions for form handling

export function handleFormSubmit(data: unknown) {
  // This is a placeholder function
  // In the future, this will send data to the backend
  console.log("Form submitted with data:", data);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${formattedHour}:${minutes} ${period}`;
}

export const DAYS_OF_WEEK = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
] as const;

export const DAY_MAPPING = {
  lunes: "monday",
  martes: "tuesday",
  miércoles: "wednesday",
  jueves: "thursday",
  viernes: "friday",
  sábado: "saturday",
  domingo: "sunday",
} as const;

export const SOCIAL_PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "twitter", label: "Twitter" },
  { value: "youtube", label: "YouTube" },
] as const;

export const APPOINTMENT_STATUS = [
  { value: "pending", label: "Pendiente" },
  { value: "confirmed", label: "Confirmada" },
  { value: "cancelled", label: "Cancelada" },
  { value: "completed", label: "Completada" },
  { value: "no-show", label: "No asistió" },
  { value: "rescheduled", label: "Reprogramada" },
] as const;

export const PAYMENT_METHODS = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta" },
  { value: "pse", label: "PSE" },
  { value: "daviplata", label: "Daviplata" },
  { value: "safetypay", label: "SafetyPay" },
] as const;

export const PAYMENT_STATUS = [
  { value: "pending", label: "Pendiente" },
  { value: "paid", label: "Pagado" },
  { value: "failed", label: "Fallido" },
] as const;
