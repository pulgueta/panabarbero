import type { output } from "zod";
import {
  array,
  boolean,
  coerce,
  email,
  literal,
  number,
  object,
  string,
  any as zodAny,
  enum as zodEnum,
} from "zod";

export const dayMapping = {
  lunes: "monday",
  martes: "tuesday",
  miércoles: "wednesday",
  jueves: "thursday",
  viernes: "friday",
  sábado: "saturday",
  domingo: "sunday",
} as const;

export const socialPlatforms = [
  "instagram",
  "facebook",
  "tiktok",
  "twitter",
  "youtube",
] as const;

export const appointmentStatusOptions = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no-show",
  "rescheduled",
] as const;

export const paymentMethodOptions = [
  "cash",
  "card",
  "pse",
  "daviplata",
  "safetypay",
] as const;

const availableDaySchema = object({
  open: string().min(1, "Hora de apertura requerida"),
  close: string().min(1, "Hora de cierre requerida"),
  active: boolean(),
});

const availableDaysSchema = object({
  lunes: availableDaySchema,
  martes: availableDaySchema,
  miércoles: availableDaySchema,
  jueves: availableDaySchema,
  viernes: availableDaySchema,
  sábado: availableDaySchema,
  domingo: availableDaySchema,
});

const socialMediaSchema = object({
  platform: zodEnum(socialPlatforms),
  url: string().url("URL inválida"),
});

export const barbershopFormSchema = object({
  name: string().min(1, "Nombre es requerido"),
  description: string().optional(),
  address: string().min(1, "Dirección es requerida"),
  city: string().min(1, "Ciudad es requerida"),
  state: string().min(1, "Departamento es requerido"),
  zipCode: string().optional(),
  contactPhone: string().optional(),
  contactEmail: string().email("Email inválido").optional().or(literal("")),
  websiteUrl: string().url("URL inválida").optional().or(literal("")),
  bannerUrl: string().url("URL inválida").optional().or(literal("")),
  isActive: boolean().default(false),
  gracePeriodMinutes: number().min(0).max(60).default(5),
  availableDays: availableDaysSchema,
  socialMedia: array(socialMediaSchema).default([]),
});

export const serviceFormSchema = object({
  name: string({ error: "El nombre del servicio es requerido" })
    .min(3, {
      message: "El nombre del servicio debe tener al menos 3 caracteres",
    })
    .max(50, {
      message: "El nombre del servicio debe tener menos de 50 caracteres",
    }),
  price: coerce
    .number({ error: "El precio del servicio es requerido" })
    .min(1000, {
      message: "El precio del servicio debe ser mayor a $1.000",
    }),
  duration: coerce
    .number()
    .min(5, {
      message: "La duración del servicio debe ser mayor a 5 minutos",
    })
    .max(480, {
      message: "La duración del servicio debe ser menor a 8 horas",
    })
    .optional(),
  barbershopId: zodAny(),
});

export const appointmentFormSchema = object({
  customerName: string({
    error: "El nombre del cliente es requerido",
  })
    .min(3, "El nombre del cliente debe tener al menos 3 caracteres")
    .max(255, "El nombre del cliente debe tener menos de 255 caracteres"),
  date: coerce
    .number({
      error: "La fecha y hora son requeridas",
    })
    .min(
      Date.now(),
      "La fecha y hora deben ser mayor a la fecha y hora actual",
    ),
  contactPhone: string({
    error: "El teléfono de contacto es requerido",
  })
    .min(10, "El teléfono debe tener al menos 10 caracteres")
    .max(10, "El teléfono debe tener menos de 10 caracteres"),
  contactEmail: email({
    error: "El email de contacto es requerido",
  })
    .min(6, "El email debe tener al menos 6 caracteres")
    .max(255, "El email debe tener menos de 255 caracteres"),
  notes: string().optional(),
  barberId: zodAny(),
});

export const reviewFormSchema = object({
  barbershopId: string().min(1, "Barbería es requerida"),
  rating: number()
    .min(1, "Calificación mínima es 1")
    .max(5, "Calificación máxima es 5"),
  comment: string().optional(),
  customerName: string().optional(),
});

export const inviteBarberFormSchema = object({
  name: string({ error: "El nombre del barbero es requerido" })
    .min(3, {
      message: "El nombre del barbero debe tener al menos 3 caracteres",
    })
    .max(255, {
      message: "El nombre del barbero debe tener menos de 255 caracteres",
    }),
  email: email({ error: "El email del barbero es requerido" }).optional(),
  phone: string({ error: "El teléfono del barbero es requerido" })
    .min(10, {
      message: "El teléfono del barbero debe tener 10 caracteres",
    })
    .regex(/^\+?[0-9]+$/, {
      message: "El teléfono del barbero debe ser válido",
    }),
});

export type BarbershopFormData = output<typeof barbershopFormSchema>;
export type ServiceFormData = output<typeof serviceFormSchema>;
export type AppointmentFormData = output<typeof appointmentFormSchema>;
export type ReviewFormData = output<typeof reviewFormSchema>;
