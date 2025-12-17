import type { Infer } from "convex/values";
import { v } from "convex/values";
import type { Id, TableNames } from "./_generated/dataModel";

export const tables = {
  userProfileData: {
    uuid: v.string(),
    userId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    notificationsPreferences: v.array(
      v.object({
        type: v.union(v.literal("email"), v.literal("push"), v.literal("sms")),
        enabled: v.boolean(),
      }),
    ),
  },
  barbershops: {
    uuid: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    address: v.object({
      fullAddress: v.string(),
      details: v.optional(v.string()),
    }),
    coordinates: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
      }),
    ),
    services: v.optional(v.array(v.id("services"))),
    contactPhone: v.optional(v.string()),
    isActive: v.boolean(),
    gracePeriodMinutes: v.optional(v.number()),
    ownerId: v.string(),
    availability: v.array(
      v.object({
        weekDay: v.object({
          day: v.union(
            v.literal("monday"),
            v.literal("tuesday"),
            v.literal("wednesday"),
            v.literal("thursday"),
            v.literal("friday"),
            v.literal("saturday"),
            v.literal("sunday"),
          ),
          isActive: v.boolean(),
        }),
        openAt: v.string(),
        closeAt: v.string(),
        lunchStart: v.optional(v.string()),
        lunchEnd: v.optional(v.string()),
      }),
    ),
    city: v.string(),
    state: v.string(),
    zipCode: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    metadataId: v.optional(v.id("barbershopMetadata")),
  },
  barbershopMetadata: {
    barbershopId: v.id("barbershops"),
    uuid: v.string(),
    websiteUrl: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    completedAppointments: v.optional(v.number()),
    reviews: v.optional(v.number()),
    rating: v.optional(v.number()),
    socialMedia: v.optional(
      v.array(
        v.object({
          platform: v.union(
            v.literal("tiktok"),
            v.literal("instagram"),
            v.literal("facebook"),
            v.literal("twitter"),
            v.literal("youtube"),
          ),
          url: v.string(),
        }),
      ),
    ),
  },
  barbershopMembers: {
    uuid: v.string(),
    userProfileDataId: v.id("userProfileData"),
    barbershopId: v.id("barbershops"),
    joinedAt: v.number(),
    isActive: v.boolean(),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("barber"),
      v.literal("staff"),
    ),
  },
  services: {
    uuid: v.string(),
    name: v.string(),
    price: v.number(),
    duration: v.number(),
    barbershopId: v.id("barbershops"),
  },
  reviews: {
    uuid: v.string(),
    rating: v.number(),
    comment: v.optional(v.string()),
    userId: v.string(),
    barbershopId: v.id("barbershops"),
  },
  appointments: {
    uuid: v.string(),
    userId: v.string(),
    barbershopId: v.id("barbershops"),
    serviceId: v.id("services"),
    barbershopMemberId: v.id("barbershopMembers"),
    date: v.number(),
    proposedDate: v.optional(v.number()),
    rescheduleRequestedByUserId: v.optional(v.string()),
    customerName: v.string(),
    contactPhone: v.string(),
    contactEmail: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("completed"),
      v.literal("no-show"),
      v.literal("rescheduled"),
      v.literal("denied"),
    ),
    notes: v.optional(v.string()),
    deletedAt: v.optional(v.number()),
  },
  notifications: {
    uuid: v.string(),
    channels: v.array(
      v.union(v.literal("email"), v.literal("push"), v.literal("sms")),
    ),
    reason: v.union(
      v.literal("appointment_created"),
      v.literal("appointment_reminder"),
      v.literal("appointment_cancelled"),
      v.literal("appointment_rescheduled"),
      v.literal("appointment_rescheduled_request"),
      v.literal("appointment_no_show"),
      v.literal("appointment_confirmed"),
      v.literal("appointment_rescheduled_accepted"),
      v.literal("appointment_rescheduled_denied"),
      v.literal("barber_invited"),
      v.literal("barber_appointment_created"),
      v.literal("past_appointment_reminder"),
    ),
    title: v.string(),
    body: v.string(),
    senderUserId: v.union(v.literal("system"), v.string()),
    receiverUserId: v.string(),
    appointmentId: v.optional(v.id("appointments")),
  },
};

const userProfileDataSchema = v.object({
  ...tables.userProfileData,
});
const barbershopSchema = v.object({
  ...tables.barbershops,
});
const barbershopMetadataSchema = v.object({
  ...tables.barbershopMetadata,
});
const barbershopMemberSchema = v.object({
  ...tables.barbershopMembers,
});
const serviceSchema = v.object({
  ...tables.services,
});
const reviewSchema = v.object({
  ...tables.reviews,
});
const appointmentSchema = v.object({
  ...tables.appointments,
});
const notificationSchema = v.object({
  ...tables.notifications,
});

type ConvexRows<T extends TableNames> = {
  _id: Id<T>;
  _creationTime: number;
};

export type UserProfileData = ConvexRows<"userProfileData"> &
  Infer<typeof userProfileDataSchema>;
export type Barbershop = ConvexRows<"barbershops"> &
  Infer<typeof barbershopSchema>;
export type BarbershopMetadata = ConvexRows<"barbershopMetadata"> &
  Infer<typeof barbershopMetadataSchema>;
export type BarbershopMember = ConvexRows<"barbershopMembers"> &
  Infer<typeof barbershopMemberSchema>;
export type BarbershopMemberWithName = BarbershopMember & {
  name: string;
};
export type Service = ConvexRows<"services"> & Infer<typeof serviceSchema>;
export type Review = ConvexRows<"reviews"> & Infer<typeof reviewSchema>;
export type Appointment = ConvexRows<"appointments"> &
  Infer<typeof appointmentSchema>;
export type Notification = ConvexRows<"notifications"> &
  Infer<typeof notificationSchema>;
