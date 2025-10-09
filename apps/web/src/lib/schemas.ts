import { z } from "zod";

// Day mapping for available days
export const dayMapping = {
  lunes: "monday",
  martes: "tuesday",
  miércoles: "wednesday",
  jueves: "thursday",
  viernes: "friday",
  sábado: "saturday",
  domingo: "sunday",
} as const;

// Social media platforms
export const socialPlatforms = [
  "instagram",
  "facebook",
  "tiktok",
  "twitter",
  "youtube",
] as const;

// Appointment status options
export const appointmentStatusOptions = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no-show",
  "rescheduled",
] as const;

// Payment method options
export const paymentMethodOptions = [
  "cash",
  "card",
  "pse",
  "daviplata",
  "safetypay",
] as const;

// Available days schema
const availableDaySchema = z.object({
  open: z.string().min(1, "Hora de apertura requerida"),
  close: z.string().min(1, "Hora de cierre requerida"),
  active: z.boolean(),
});

const availableDaysSchema = z.object({
  lunes: availableDaySchema,
  martes: availableDaySchema,
  miércoles: availableDaySchema,
  jueves: availableDaySchema,
  viernes: availableDaySchema,
  sábado: availableDaySchema,
  domingo: availableDaySchema,
});

// Social media schema
const socialMediaSchema = z.object({
  platform: z.enum(socialPlatforms),
  url: z.string().url("URL inválida"),
});

// Barbershop form schema
export const barbershopFormSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  description: z.string().optional(),
  address: z.string().min(1, "Dirección es requerida"),
  city: z.string().min(1, "Ciudad es requerida"),
  state: z.string().min(1, "Departamento es requerido"),
  zipCode: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  websiteUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  bannerUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  isActive: z.boolean().default(false),
  gracePeriodMinutes: z.number().min(0).max(60).default(5),
  availableDays: availableDaysSchema,
  socialMedia: z.array(socialMediaSchema).default([]),
});

// Service form schema
export const serviceFormSchema = z.object({
  name: z.string().min(1, "Nombre del servicio es requerido"),
  description: z.string().optional(),
  price: z.number().min(1, "Precio debe ser mayor a 0"),
  duration: z
    .number()
    .min(5, "Duración mínima es 5 minutos")
    .max(480, "Duración máxima es 8 horas")
    .optional(),
  barbershopId: z.string().min(1, "Barbería es requerida"),
});

// Appointment form schema
export const appointmentFormSchema = z.object({
  customerName: z.string().min(1, "Nombre del cliente es requerido"),
  customerPhone: z.string().min(1, "Teléfono del cliente es requerido"),
  customerEmail: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  barbershopId: z.string().min(1, "Barbería es requerida"),
  barberId: z.string().min(1, "Barbero es requerido"),
  serviceId: z.string().min(1, "Servicio es requerido"),
  date: z.date({
    required_error: "Fecha es requerida",
  }),
  startTime: z.string().min(1, "Hora de inicio es requerida"),
  notes: z.string().optional(),
});

// Review form schema
export const reviewFormSchema = z.object({
  barbershopId: z.string().min(1, "Barbería es requerida"),
  rating: z
    .number()
    .min(1, "Calificación mínima es 1")
    .max(5, "Calificación máxima es 5"),
  comment: z.string().optional(),
  customerName: z.string().optional(),
});

// Type exports
export type BarbershopFormData = z.infer<typeof barbershopFormSchema>;
export type ServiceFormData = z.infer<typeof serviceFormSchema>;
export type AppointmentFormData = z.infer<typeof appointmentFormSchema>;
export type ReviewFormData = z.infer<typeof reviewFormSchema>;
