import type { output } from "zod";
import {
  array,
  boolean,
  coerce,
  email,
  literal,
  object,
  string,
  url,
  any as zodAny,
  enum as zodEnum,
  undefined as zodUndefined,
} from "zod";

// availability: {
// weekDay: {
// day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
// isActive: boolean;
// };
// openAt: string;
// closeAt: string;
// }[]

export const tokenSchema = object({
  token: string().min(1, "El token es requerido"),
});

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
  openAt: string().min(1, "Hora de disponibilidad inicial requerida"),
  closeAt: string().min(1, "Hora de disponibilidad final requerida"),
  lunchStart: string().optional(),
  lunchEnd: string().optional(),
});

export const barbershopFormSchema = object({
  name: string({ error: "Nombre requerido" })
    .min(3, {
      message: "El nombre debe tener al menos 3 caracteres",
    })
    .max(255, {
      message: "El nombre debe tener menos de 255 caracteres",
    })
    .trim(),
  description: string().optional(),
  address: object({
    fullAddress: string().min(1, "Dirección requerida"),
    details: string().optional(),
  }),
  city: string().min(1, "Selecciona una ciudad"),
  state: string().min(1, "Selecciona un departamento"),
  zipCode: string().optional(),
  contactPhone: string().optional(),
  bannerUrl: url("URL inválida").optional().or(literal("")),
  isActive: boolean().default(false),
  gracePeriodMinutes: coerce
    .number()
    .min(5, {
      error: "Debes establecer un periodo de gracia mayor a 5 minutos",
    })
    .max(20, {
      error: "Debes establecer un periodo de gracia menor a 20 minutos",
    })
    .default(5),
  availability: array(availabilitySchema).default([]),
  ownerIsBarber: boolean().default(true),
});

const serviceFormSchema = object({
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
    .trim()
    .min(8, "Introduce un número de teléfono válido")
    .max(22, "Introduce un número de teléfono válido"),
  contactEmail: email().or(zodUndefined()),
  notes: string().optional(),
  barbershopMemberId: zodAny(),
  serviceId: zodAny(),
});

export type ServiceFormData = output<typeof serviceFormSchema>;

export const rescheduleRequestFormSchema = object({
  date: coerce
    .number({
      error: "La fecha y hora son requeridas",
    })
    .min(
      Date.now(),
      "La fecha y hora deben ser mayor a la fecha y hora actual",
    ),
});

export const cancelAppointmentFormSchema = object({
  notes: string()
    .min(3, "Debes proporcionar una explicación para la cancelación.")
    .max(300, "La nota debe tener máximo 300 caracteres"),
});
