import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import * as auth from "./auth-schema";

export type SocialMedia = {
  instagramUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
};

export type Day =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
export type AvailableDays = {
  [key in Day]: {
    open: string;
    close: string;
  };
};

export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
]);
export const paymentMethod = pgEnum("payment_method", [
  "cash",
  "card",
  "pse",
  "daviplata",
  "safetypay",
]);

export type PaymentMethod = (typeof paymentMethod.enumValues)[number];
export type PaymentStatus = (typeof paymentStatus.enumValues)[number];

export const appointmentStatus = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no-show",
  "rescheduled",
]);

export type AppointmentStatus = (typeof appointmentStatus.enumValues)[number];

export const notificationType = pgEnum("notification_type", [
  "email",
  "push",
  "sms",
]);
export const notificationReason = pgEnum("notification_reason", [
  "appointment_reminder",
  "appointment_cancelled",
  "appointment_rescheduled",
  "appointment_no_show",
  "appointment_confirmed",
]);

export type NotificationType = (typeof notificationType.enumValues)[number];
export type NotificationReason = (typeof notificationReason.enumValues)[number];

const commonRows = {
  id: text()
    .notNull()
    .primaryKey()
    .unique()
    .$defaultFn(() => Bun.randomUUIDv7()),
  uuid: uuid().notNull().unique().defaultRandom(),
  createdAt: timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp({ mode: "date", withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
};

export const barbershops = pgTable(
  "barbershops",
  (t) => ({
    ...commonRows,
    name: t.text().notNull(),
    description: t.text(),
    address: t.text().notNull(),
    coordinates: t.geometry({ mode: "tuple", type: "point" }),
    contactPhone: t.text(),
    socialMedia: t.jsonb().$type<SocialMedia>(),
    isActive: t.boolean().notNull().default(false),
    gracePeriod: t.integer().notNull().default(10),
    ownerId: t
      .text()
      .notNull()
      .references(() => auth.user.id, { onDelete: "cascade" }),
    availableDays: t.jsonb().$type<AvailableDays>().notNull(),
    city: t.text().notNull(),
    state: t.text().notNull(),
    zipCode: t.text(),
    logoUrl: t.text(),
    bannerUrl: t.text(),
    coverUrl: t.text(),
    contactEmail: t.text(),
    websiteUrl: t.text(),
  }),
  (t) => [
    index("barbershops_owner_id_idx").on(t.ownerId),
    index("barbershops_city_state_idx").on(t.city, t.state),
    index("barbershops_spacial_idx").using("gist", t.coordinates),
  ],
);

export const barbershopsRelations = relations(barbershops, ({ one, many }) => ({
  owner: one(auth.user, {
    fields: [barbershops.ownerId],
    references: [auth.user.id],
  }),
  barbers: many(barbers),
  services: many(services),
  reviews: many(reviews),
  appointments: many(appointments),
}));

export type Barbershop = typeof barbershops.$inferSelect;

export const barbers = pgTable(
  "barbers",
  (t) => ({
    ...commonRows,
    userId: t
      .text()
      .notNull()
      .references(() => auth.user.id, { onDelete: "cascade" }),
    barbershopId: t
      .text()
      .notNull()
      .references(() => barbershops.id, { onDelete: "cascade" }),
  }),
  (t) => [
    index("barbers_user_id_idx").on(t.userId),
    index("barbers_barbershop_id_idx").on(t.barbershopId),
  ],
);

export const barbersRelations = relations(barbers, ({ one, many }) => ({
  user: one(auth.user, {
    fields: [barbers.userId],
    references: [auth.user.id],
  }),
  barbershops: many(barbershops),
}));

export type Barber = typeof barbers.$inferSelect;

export const services = pgTable(
  "services",
  (t) => ({
    ...commonRows,
    name: t.text().notNull(),
    description: t.text(),
    price: t.integer().notNull(),
    duration: t.integer(),
    nameVector: t.vector({ dimensions: 1536 }),
    barbershopId: t
      .text()
      .notNull()
      .references(() => barbershops.id, { onDelete: "cascade" }),
  }),
  (t) => [
    index("name_vector_idx").using(
      "hnsw",
      t.nameVector.op("vector_cosine_ops"),
    ),
    index("services_barbershop_id_idx").on(t.barbershopId),
  ],
);

export const servicesRelations = relations(services, ({ one }) => ({
  barbershop: one(barbershops, {
    fields: [services.barbershopId],
    references: [barbershops.id],
  }),
}));

export type Service = typeof services.$inferSelect;

export const reviews = pgTable(
  "reviews",
  (t) => ({
    ...commonRows,
    rating: t.integer().notNull(),
    comment: t.text(),
    userId: t
      .text()
      .notNull()
      .references(() => auth.user.id, { onDelete: "cascade" }),
    barbershopId: t
      .text()
      .notNull()
      .references(() => barbershops.id, { onDelete: "cascade" }),
  }),
  (t) => [
    index("reviews_user_id_idx").on(t.userId),
    index("reviews_barbershop_id_idx").on(t.barbershopId),
  ],
);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(auth.user, {
    fields: [reviews.userId],
    references: [auth.user.id],
  }),
  barbershop: one(barbershops, {
    fields: [reviews.barbershopId],
    references: [barbershops.id],
  }),
}));

export type Review = typeof reviews.$inferSelect;

export const appointments = pgTable(
  "appointments",
  (t) => ({
    ...commonRows,
    userId: t
      .text()
      .notNull()
      .references(() => auth.user.id, { onDelete: "cascade" }),
    barbershopId: t
      .text()
      .notNull()
      .references(() => barbershops.id, { onDelete: "cascade" }),
    serviceId: t
      .text()
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    barberId: t
      .text()
      .notNull()
      .references(() => barbers.id, { onDelete: "cascade" }),
    date: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    startAt: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    endAt: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    status: appointmentStatus().notNull().default("pending"),
    notes: t.text(),
  }),
  (t) => [
    index("appointments_user_id_idx").on(t.userId),
    index("appointments_barbershop_id_idx").on(t.barbershopId),
    index("appointments_service_id_idx").on(t.serviceId),
    index("appointments_barber_id_idx").on(t.barberId),
    index("appointments_status_idx").on(t.status),
  ],
);

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  user: one(auth.user, {
    fields: [appointments.userId],
    references: [auth.user.id],
  }),
  barbershop: one(barbershops, {
    fields: [appointments.barbershopId],
    references: [barbershops.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
}));

export type Appointment = typeof appointments.$inferSelect;

export const payments = pgTable(
  "payments",
  (t) => ({
    ...commonRows,
    appointmentId: t
      .text()
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    transactionId: t.text().notNull(),
    paymentDate: t.timestamp({ mode: "date", withTimezone: true }).notNull(),
    amount: t.integer().notNull(),
    status: paymentStatus().notNull().default("pending"),
    method: paymentMethod().notNull(),
  }),
  (t) => [
    index("payments_appointment_id_idx").on(t.appointmentId),
    index("payments_status_idx").on(t.status),
    index("payments_method_idx").on(t.method),
  ],
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  appointment: one(appointments, {
    fields: [payments.appointmentId],
    references: [appointments.id],
  }),
}));

export type Payment = typeof payments.$inferSelect;

export const notifications = pgTable("notifications", (t) => ({
  ...commonRows,
  type: notificationType().notNull(),
  reason: notificationReason().notNull(),
  text: t.text().notNull(),
  userId: t
    .text()
    .notNull()
    .references(() => auth.user.id, { onDelete: "cascade" }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(auth.user, {
    fields: [notifications.userId],
    references: [auth.user.id],
  }),
}));

export type Notification = typeof notifications.$inferSelect;

export * from "./auth-schema";
