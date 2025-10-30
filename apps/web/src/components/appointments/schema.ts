import { email, number, object, string, any as zodAny } from "zod";

export const bookingFormSchema = object({
  customerName: string({
    error: "El nombre del cliente es requerido",
  })
    .min(3, "El nombre del cliente debe tener al menos 3 caracteres")
    .max(255, "El nombre del cliente debe tener menos de 255 caracteres"),
  date: number({
    error: "La fecha es requerida",
  }),
  startTime: number({
    error: "La hora de inicio es requerida",
  }).min(0, "La hora de inicio debe ser mayor a 0"),
  endTime: number({
    error: "La hora de fin es requerida",
  }),
  contactPhone: string({
    error: "El teléfono de contacto es requerido",
  })
    .min(10, "El teléfono debe tener 10 caracteres")
    .max(10, "El teléfono debe tener máximo 10 caracteres"),
  contactEmail: email({
    error: "El email de contacto es requerido",
  })
    .min(6, "El email debe tener al menos 6 caracteres")
    .max(255, "El email debe tener menos de 255 caracteres"),
  notes: string().optional(),
  barberId: zodAny(),
});
