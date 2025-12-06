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
  url,
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

// availability: {
// weekDay: {
// day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
// isActive: boolean;
// };
// openAt: string;
// closeAt: string;
// }[]

const day = zodEnum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

const availabilitySchema = object({
  weekDay: object({
    day,
    isActive: boolean(),
  }),
  openAt: string().min(1, "Hora de apertura requerida"),
  closeAt: string().min(1, "Hora de cierre requerida"),
  lunchStart: string().optional(),
  lunchEnd: string().optional(),
});

const socialMediaSchema = object({
  platform: zodEnum(socialPlatforms),
  url: string().url("URL inválida"),
});

export const barbershopFormSchema = object({
  name: string({ error: "El nombre de la barbería es requerido" })
    .min(3, {
      message: "El nombre de la barbería debe tener al menos 3 caracteres",
    })
    .max(255, {
      message: "El nombre de la barbería debe tener menos de 255 caracteres",
    }),
  description: string().optional(),
  address: object({
    fullAddress: string().min(1, "La dirección de la barbería es requerida"),
    details: string().optional(),
  }),
  city: string().min(1, "La ciudad es requerida"),
  state: string().min(1, "El departamento es requerido"),
  zipCode: string().optional(),
  contactPhone: string().optional(),
  bannerUrl: url("URL inválida").optional().or(literal("")),
  isActive: boolean().default(false),
  gracePeriodMinutes: coerce.number().min(5).max(60).default(5),
  availability: array(availabilitySchema).default([]),
  metadataId: zodAny(),
});

export const barbershopFormSchemaV2 = object({
  name: string({ error: "El nombre de la barbería es requerido" })
    .min(3, {
      message: "El nombre de la barbería debe tener al menos 3 caracteres",
    })
    .max(255, {
      message: "El nombre de la barbería debe tener menos de 255 caracteres",
    }),
  description: string().optional(),
  address: object({
    fullAddress: string().min(1, "Dirección es requerida"),
    details: string().optional(),
  }),
  city: string().min(1, "Ciudad es requerida"),
  state: string().min(1, "Departamento es requerido"),
  openAt: string().min(1, "Hora de apertura requerida"),
  closeAt: string().min(1, "Hora de cierre requerida"),
  lunchStart: string().optional(),
  lunchEnd: string().optional(),
  zipCode: string().optional(),
  contactPhone: string().optional(),
  bannerUrl: url("URL inválida").optional().or(literal("")),
  isActive: boolean().default(false),
  gracePeriodMinutes: coerce.number().min(5).max(60).default(5),
  // availability: array(availabilitySchema).default([]),
  metadata: object({
    websiteUrl: url().optional(),
    contactEmail: email().optional(),
    completedAppointments: coerce.number().optional(),
    reviews: coerce.number().optional(),
    rating: coerce.number().optional(),
    socialMedia: array(socialMediaSchema).optional(),
  }),
});

export type BarbershopFormDataV2 = output<typeof barbershopFormSchemaV2>;

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
    }),
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
  barbershopMemberId: zodAny(),
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
  barbershopId: zodAny(),
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

export const rescheduleRequestFormSchema = object({
  date: coerce
    .number({
      error: "La fecha y hora son requeridas",
    })
    .min(
      Date.now(),
      "La fecha y hora deben ser mayor a la fecha y hora actual",
    ),
  note: string()
    .max(280, "La nota debe tener máximo 280 caracteres")
    .optional(),
});

export type RescheduleRequestFormData = output<
  typeof rescheduleRequestFormSchema
>;

export const cancelAppointmentFormSchema = object({
  notes: string()
    .min(3, "Debes proporcionar una explicación para la cancelación.")
    .max(300, "La nota debe tener máximo 300 caracteres"),
});

export type CancelAppointmentFormData = output<
  typeof cancelAppointmentFormSchema
>;
