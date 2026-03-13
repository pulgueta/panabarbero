import { defineSchema } from "convex/server";
import type { output } from "zod";
import { z } from "zod";
import { zodTable } from ".";

export const userProfileData = zodTable("userProfileData", () => ({
  userId: z.string(),
  email: z.string(),
  name: z.string().optional(),
  phoneNumber: z.string().optional(),
  notificationsPreferences: z.array(
    z.object({
      type: z.enum(["email", "sms"]),
      enabled: z.boolean(),
    }),
  ),
}));

export const barbershops = zodTable("barbershops", (id) => ({
  uuid: z.uuidv4().default(crypto.randomUUID()),
  name: z.string(),
  description: z.string().optional(),
  address: z.object({
    fullAddress: z.string(),
    details: z.string().optional(),
  }),
  services: id("services").array(),
  contactPhone: z.string().optional(),
  isActive: z.boolean(),
  gracePeriodMinutes: z.number().optional().default(5),
  ownerId: z.string(),
  availability: z
    .object({
      weekDay: z.object({
        day: z.enum([
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ]),
        isActive: z.boolean(),
      }),
      openAt: z.string(),
      closeAt: z.string(),
      lunchStart: z.string().optional(),
      lunchEnd: z.string().optional(),
    })
    .array(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string().optional(),
  logoKey: z.string().optional(),
  metadataId: id("barbershopMetadata").optional(),
}));

export const barbershopMetadata = zodTable("barbershopMetadata", (id) => ({
  barbershopId: id("barbershops"),
  websiteUrl: z.string().optional(),
  contactEmail: z.string().optional(),
  socialMedia: z
    .array(
      z.object({
        platform: z.enum([
          "tiktok",
          "instagram",
          "facebook",
          "twitter",
          "youtube",
        ]),
        url: z.string(),
      }),
    )
    .optional(),
}));

export const barbershopMembers = zodTable("barbershopMembers", (id) => ({
  userProfileDataId: id("userProfileData"),
  barbershopId: id("barbershops"),
  joinedAt: z.number(),
  isActive: z.boolean(),
  roles: z.enum(["owner", "barber"]).array(),
}));

export const services = zodTable("services", (id) => ({
  name: z.string({ error: "El nombre es requerido" }),
  price: z.coerce
    .number({ error: "El precio es requerido" })
    .min(1000, { error: "El precio debe ser mayor a $1.000" }),
  duration: z.coerce
    .number({ error: "La duración es requerida" })
    .min(5, { error: "La duración debe ser mayor a 5 minutos" })
    .max(480, { error: "La duración debe ser menor a 8 horas" }),
  barbershopId: id("barbershops"),
}));

export const reviews = zodTable("reviews", (id) => ({
  uuid: z.uuidv4().default(crypto.randomUUID()),
  rating: z.number(),
  comment: z.string().optional(),
  userId: z.string(),
  barbershopId: id("barbershops"),
}));

export const appointments = zodTable("appointments", (id) => ({
  userId: z.string(),
  barbershopId: id("barbershops"),
  serviceId: id("services"),
  barbershopMemberId: id("barbershopMembers"),
  date: z.coerce
    .number({
      error: "La fecha y hora son requeridas",
    })
    .min(
      Date.now(),
      "La fecha y hora deben ser mayor a la fecha y hora actual",
    ),
  proposedDate: z.number().optional(),
  rescheduleRequestedByUserId: z.string().optional(),
  customerName: z
    .string({
      error: "El nombre del cliente es requerido",
    })
    .min(3, "El nombre del cliente debe tener al menos 3 caracteres")
    .max(255, "El nombre del cliente debe tener menos de 255 caracteres"),
  contactPhone: z
    .string({
      error: "El teléfono de contacto es requerido",
    })
    .min(10, "El teléfono debe tener al menos 10 caracteres")
    .max(10, "El teléfono debe tener menos de 10 caracteres"),
  contactEmail: z.string().optional(),
  status: z
    .enum([
      "pending",
      "confirmed",
      "cancelled",
      "completed",
      "no-show",
      "rescheduled",
      "denied",
    ])
    .default("confirmed"),
  notes: z.string().optional(),
  deletedAt: z.number().optional(),
  upcomingNotificationId: id("_scheduled_functions").optional(),
  pastReminderNotificationId: id("_scheduled_functions").optional(),
}));

export const barbershopMemberServices = zodTable(
  "barbershopMemberServices",
  (id) => ({
    uuid: z.uuidv4().default(crypto.randomUUID()),
    barbershopId: id("barbershops"),
    barbershopMemberId: id("barbershopMembers"),
    serviceId: id("services"),
    isActive: z.boolean().optional(),
  }),
);

export const invitations = zodTable("invitations", (id) => ({
  barbershopId: id("barbershops"),
  email: z.string(),
  phone: z.string(),
  roles: z.enum(["barber"]).array(),
  code: z.string(),
  status: z.enum(["pending", "accepted", "denied", "expired"]),
  expiresAt: z.number(),
  inviterUserId: z.string(),
}));

export const usage = zodTable("usage", (id) => ({
  barbershopId: id("barbershops"),
  month: z.string(),
  smsSent: z.number(),
  emailsSent: z.number(),
}));

export default defineSchema({
  userProfileData: userProfileData
    .table()
    .index("by_userId", ["userId"])
    .index("by_email", ["email"])
    .index("by_phoneNumber", ["phoneNumber"]),
  barbershops: barbershops
    .table()
    .index("by_ownerId", ["ownerId"])
    .index("by_city_and_state", ["city", "state"])
    .index("by_isActive", ["isActive"])
    .searchIndex("by_name_search", {
      searchField: "name",
      filterFields: ["isActive", "state", "city"],
    })
    .index("by_uuid", ["uuid"]),

  barbershopMetadata: barbershopMetadata
    .table()
    .index("by_barbershopId", ["barbershopId"]),

  barbershopMembers: barbershopMembers
    .table()
    .index("by_userProfileDataId", ["userProfileDataId"])
    .index("by_barbershopId", ["barbershopId"])
    .index("by_isActive", ["isActive"]),

  services: services
    .table()
    .index("by_barbershopId", ["barbershopId"])
    .searchIndex("by_name_search_idx", { searchField: "name" }),

  reviews: reviews
    .table()
    .index("by_userId", ["userId"])
    .index("by_barbershopId", ["barbershopId"]),

  appointments: appointments
    .table()
    .index("by_userId", ["userId"])
    .index("by_barbershopId", ["barbershopId"])
    .index("by_userIdAndBarbershopId", ["userId", "barbershopId"])
    .index("by_serviceId", ["serviceId"])
    .index("by_barbershopMemberId", ["barbershopMemberId"])
    .index("by_status", ["status"])
    .index("by_date", ["date"])
    .index("by_deletedAt", ["deletedAt"]),

  barbershopMemberServices: barbershopMemberServices
    .table()
    .index("by_uuid", ["uuid"])
    .index("by_barbershopMemberId", ["barbershopMemberId"])
    .index("by_barbershopId", ["barbershopId"])
    .index("by_serviceId", ["serviceId"]),

  invitations: invitations
    .table()
    .index("by_barbershopId", ["barbershopId"])
    .index("by_email", ["email"])
    .index("by_code", ["code"])
    .index("by_status", ["status"])
    .index("by_expiresAt", ["expiresAt"]),

  usage: usage.table().index("by_barbershop_month", ["barbershopId", "month"]),
});

export type UserProfileData = output<typeof userProfileData.schema>;
export type Barbershop = output<typeof barbershops.schema>;
export type BarbershopMetadata = output<typeof barbershopMetadata.schema>;
export type BarbershopMember = output<typeof barbershopMembers.schema>;
export type BarbershopMemberWithName = BarbershopMember & {
  name: string;
};
export type BarbershopMetadataWithCount = BarbershopMetadata & {
  completedAppointments: number;
  /** Resolved CDN URL for the logo, constructed from logoKey + VITE_STORAGE_URL on the client */
  logoUrl?: string;
};
export type Service = output<typeof services.schema>;
export type Review = output<typeof reviews.schema>;
export type Appointment = output<typeof appointments.schema>;
export type BarbershopMemberServices = output<
  typeof barbershopMemberServices.schema
>;
export type Invitation = output<typeof invitations.schema>;
export type Usage = output<typeof usage.schema>;
