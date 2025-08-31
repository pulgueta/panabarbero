import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import type { output } from "zod";
import { coerce, email, object, string, url, enum as zodEnum } from "zod";

import * as auth from "../auth-schema";
import {
  appointmentStatus,
  appointments,
  barbers,
  barbershops,
  mobilePushTokens,
  notifications,
  payments,
  reviews,
  services,
} from "../schema";

export const getByIdSchema = object({
  id: string(),
});

export const querySchema = object({
  page: coerce.number().default(1),
  limit: coerce.number().default(10),
});

export const createdResourceSchema = object({
  id: string(),
});

export const createBarbershopSchema = createInsertSchema(barbershops, {
  address: (s) =>
    s.min(8, { message: "La dirección debe tener al menos 8 caracteres" }),
  name: (s) =>
    s.min(3, {
      message: "El nombre de tu barbería debe tener al menos 3 caracteres",
    }),
  city: (s) =>
    s.min(3, { message: "La ciudad debe tener al menos 3 caracteres" }),
  state: (s) =>
    s.min(3, { message: "El departamento debe tener al menos 3 caracteres" }),
  gracePeriodMinutes: () =>
    coerce
      .number()
      .min(5, { message: "El periodo de gracia debe ser mayor a 5 minutos" })
      .max(60, { message: "El periodo de gracia debe ser menor a 60 minutos" })
      .optional(),
  bannerUrl: url({
    error: "Debes proporcionar una URL HTTPS válida",
    protocol: /https/,
  }).optional(),
  contactEmail: email({
    error: "Debes proporcionar un email válido",
  }).optional(),
  websiteUrl: url({
    error: "Debes proporcionar una URL HTTPS válida",
    protocol: /https/,
  }).optional(),
  zipCode: (s) =>
    s
      .min(5, { message: "El código postal debe tener al menos 5 caracteres" })
      .optional(),
  contactPhone: (s) =>
    s
      .min(10, {
        message: "El número de teléfono debe tener al menos 10 caracteres",
      })
      .regex(/^\+?[0-9]+$/, {
        message: "El número de teléfono debe ser válido",
      })
      .optional(),
  description: (s) =>
    s
      .min(10, { message: "La descripción debe tener al menos 10 caracteres" })
      .optional(),
})
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    uuid: true,
  })
  .extend({
    logo: url().optional(),
  });
export const updateBarbershopSchema = createUpdateSchema(barbershops, {
  address: (s) =>
    s.min(8, { message: "La dirección debe tener al menos 8 caracteres" }),
  name: (s) =>
    s.min(3, {
      message: "El nombre de tu barbería debe tener al menos 3 caracteres",
    }),
  city: (s) =>
    s.min(3, { message: "La ciudad debe tener al menos 3 caracteres" }),
  state: (s) =>
    s.min(3, { message: "El departamento debe tener al menos 3 caracteres" }),
  gracePeriodMinutes: () =>
    coerce
      .number()
      .min(5, { message: "El periodo de gracia debe ser mayor a 5 minutos" })
      .max(60, { message: "El periodo de gracia debe ser menor a 60 minutos" })
      .optional(),
  logo: url({
    error: "Debes proporcionar una URL HTTPS válida",
    protocol: /https/,
  }).optional(),
  bannerUrl: url({
    error: "Debes proporcionar una URL HTTPS válida",
    protocol: /https/,
  }).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
});

export const barbershopSchema = createSelectSchema(barbershops);

export const barbershopWithOrganizationSchema = createSelectSchema(
  barbershops,
).extend({
  organization: createSelectSchema(auth.organization),
});

export type CreateBarbershop = output<typeof createBarbershopSchema>;
export type UpdateBarbershop = output<typeof updateBarbershopSchema>;
export type Barbershop = output<typeof barbershopSchema>;
export type BarbershopWithOrganization = output<
  typeof barbershopWithOrganizationSchema
>;

export const createBarberSchema = createInsertSchema(barbers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
});
export const updateBarberSchema = createUpdateSchema(barbers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
});

export const barberSchema = createSelectSchema(barbers);

export type CreateBarber = output<typeof createBarberSchema>;
export type UpdateBarber = output<typeof updateBarberSchema>;
export type Barber = output<typeof barberSchema>;

export const createAppointmentSchema = createInsertSchema(appointments, {
  date: (s) =>
    s.min(new Date(), { message: "La fecha debe ser mayor a la fecha actual" }),
  endAt: (s) =>
    s.min(new Date(), {
      message: "La fecha de fin debe ser mayor a la fecha actual",
    }),
  startAt: (s) =>
    s.min(new Date(), {
      message: "La fecha de inicio debe ser mayor a la fecha actual",
    }),
  notes: (s) =>
    s
      .min(10, { message: "Las notas deben tener al menos 10 caracteres" })
      .optional(),
  status: () =>
    zodEnum(appointmentStatus.enumValues, { error: "El estado no es válido" })
      .optional()
      .default("pending"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
});
export const updateAppointmentSchema = createUpdateSchema(appointments, {
  date: (s) =>
    s.min(new Date(), { message: "La fecha debe ser mayor a la fecha actual" }),
  endAt: (s) =>
    s.min(new Date(), {
      message: "La fecha de fin debe ser mayor a la fecha actual",
    }),
}).omit({
  createdAt: true,
  updatedAt: true,
  uuid: true,
});

export const appointmentSchema = createSelectSchema(appointments);

export type CreateAppointment = output<typeof createAppointmentSchema>;
export type UpdateAppointment = output<typeof updateAppointmentSchema>;
export type Appointment = output<typeof appointmentSchema>;

export const createMobilePushTokenSchema = createInsertSchema(
  mobilePushTokens,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
});
export const updateMobilePushTokenSchema = createUpdateSchema(
  mobilePushTokens,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
});

export const mobilePushTokenSchema = createSelectSchema(mobilePushTokens);

export type CreateMobilePushToken = output<typeof createMobilePushTokenSchema>;
export type UpdateMobilePushToken = output<typeof updateMobilePushTokenSchema>;
export type MobilePushToken = output<typeof mobilePushTokenSchema>;

export const createReviewSchema = createInsertSchema(reviews, {
  rating: () =>
    coerce.number().min(1, { message: "La calificación debe ser mayor a 0" }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
});
export const updateReviewSchema = createUpdateSchema(reviews, {
  rating: () =>
    coerce.number().min(1, { message: "La calificación debe ser mayor a 0" }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
});

export const reviewSchema = createSelectSchema(reviews);

export type CreateReview = output<typeof createReviewSchema>;
export type UpdateReview = output<typeof updateReviewSchema>;
export type Review = output<typeof reviewSchema>;

export const createServiceSchema = createInsertSchema(services, {
  price: () =>
    coerce.number().min(1, { message: "El precio debe ser mayor a 0" }),
  name: (s) =>
    s.min(3, { message: "El nombre debe tener al menos 3 caracteres" }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
});
export const updateServiceSchema = createUpdateSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
});

export const serviceSchema = createSelectSchema(services);

export type CreateService = output<typeof createServiceSchema>;
export type UpdateService = output<typeof updateServiceSchema>;
export type Service = output<typeof serviceSchema>;

export const createPaymentSchema = createInsertSchema(payments, {
  amount: () =>
    coerce.number().min(1, { message: "El monto debe ser mayor a 0" }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
});
export const updatePaymentSchema = createUpdateSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
});

export const paymentSchema = createSelectSchema(payments);

export type CreatePayment = output<typeof createPaymentSchema>;
export type UpdatePayment = output<typeof updatePaymentSchema>;
export type Payment = output<typeof paymentSchema>;

export const createNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
});
export const updateNotificationSchema = createUpdateSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
});

export const notificationSchema = createSelectSchema(notifications);

export type CreateNotification = output<typeof createNotificationSchema>;
export type UpdateNotification = output<typeof updateNotificationSchema>;
export type Notification = output<typeof notificationSchema>;
