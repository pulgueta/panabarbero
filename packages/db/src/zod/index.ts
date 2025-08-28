import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import type { output } from "zod";

import {
  appointments,
  barbers,
  barbershops,
  mobilePushTokens,
  notifications,
  payments,
  reviews,
  services,
} from "../schema";

export const createBarbershopSchema = createInsertSchema(barbershops).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
  deletedAt: true,
});
export const updateBarbershopSchema = createUpdateSchema(barbershops).omit({
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
  deletedAt: true,
});

export const barbershopSchema = createSelectSchema(barbershops);

export type CreateBarbershop = output<typeof createBarbershopSchema>;
export type UpdateBarbershop = output<typeof updateBarbershopSchema>;
export type Barbershop = output<typeof barbershopSchema>;

export const createBarberSchema = createInsertSchema(barbers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
  deletedAt: true,
});
export const updateBarberSchema = createUpdateSchema(barbers).omit({
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
  deletedAt: true,
});

export const barberSchema = createSelectSchema(barbers);

export type CreateBarber = output<typeof createBarberSchema>;
export type UpdateBarber = output<typeof updateBarberSchema>;
export type Barber = output<typeof barberSchema>;

export const createAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
  deletedAt: true,
});
export const updateAppointmentSchema = createUpdateSchema(appointments).omit({
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
  deletedAt: true,
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
  isActive: true,
  deletedAt: true,
});
export const updateMobilePushTokenSchema = createUpdateSchema(
  mobilePushTokens,
).omit({
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
  deletedAt: true,
});

export const mobilePushTokenSchema = createSelectSchema(mobilePushTokens);

export type CreateMobilePushToken = output<typeof createMobilePushTokenSchema>;
export type UpdateMobilePushToken = output<typeof updateMobilePushTokenSchema>;
export type MobilePushToken = output<typeof mobilePushTokenSchema>;

export const createReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
  deletedAt: true,
});
export const updateReviewSchema = createUpdateSchema(reviews).omit({
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
  deletedAt: true,
});

export const reviewSchema = createSelectSchema(reviews);

export type CreateReview = output<typeof createReviewSchema>;
export type UpdateReview = output<typeof updateReviewSchema>;
export type Review = output<typeof reviewSchema>;

export const createServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
  deletedAt: true,
});
export const updateServiceSchema = createUpdateSchema(services).omit({
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
  deletedAt: true,
});

export const serviceSchema = createSelectSchema(services);

export type CreateService = output<typeof createServiceSchema>;
export type UpdateService = output<typeof updateServiceSchema>;
export type Service = output<typeof serviceSchema>;

export const createPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
  deletedAt: true,
});
export const updatePaymentSchema = createUpdateSchema(payments).omit({
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
  deletedAt: true,
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
  isActive: true,
  deletedAt: true,
});
export const updateNotificationSchema = createUpdateSchema(notifications).omit({
  createdAt: true,
  updatedAt: true,
  uuid: true,
  isActive: true,
  deletedAt: true,
});

export const notificationSchema = createSelectSchema(notifications);

export type CreateNotification = output<typeof createNotificationSchema>;
export type UpdateNotification = output<typeof updateNotificationSchema>;
export type Notification = output<typeof notificationSchema>;
