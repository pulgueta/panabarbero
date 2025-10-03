import { v } from "convex/values";

export const tables = {
  barbershops: {
    uuid: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    organizationId: v.string(),
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
    contactPhone: v.optional(v.string()),
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
    isActive: v.boolean(),
    gracePeriodMinutes: v.optional(v.number()),
    ownerId: v.string(),
    availableDays: v.object({
      monday: v.union(
        v.object({ open: v.string(), close: v.string() }),
        v.null(),
      ),
      tuesday: v.union(
        v.object({ open: v.string(), close: v.string() }),
        v.null(),
      ),
      wednesday: v.union(
        v.object({ open: v.string(), close: v.string() }),
        v.null(),
      ),
      thursday: v.union(
        v.object({ open: v.string(), close: v.string() }),
        v.null(),
      ),
      friday: v.union(
        v.object({ open: v.string(), close: v.string() }),
        v.null(),
      ),
      saturday: v.union(
        v.object({ open: v.string(), close: v.string() }),
        v.null(),
      ),
      sunday: v.union(
        v.object({ open: v.string(), close: v.string() }),
        v.null(),
      ),
    }),
    city: v.string(),
    state: v.string(),
    zipCode: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
  },
  barbers: {
    uuid: v.string(),
    userId: v.string(),
    memberId: v.string(),
    barbershopId: v.id("barbershops"),
  },
  services: {
    uuid: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    duration: v.optional(v.number()),
    nameVector: v.optional(v.array(v.float64())),
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
    barberId: v.id("barbers"),
    date: v.number(),
    startAt: v.number(),
    endAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("completed"),
      v.literal("no-show"),
      v.literal("rescheduled"),
    ),
    notes: v.optional(v.string()),
  },
  payments: {
    uuid: v.string(),
    appointmentId: v.id("appointments"),
    transactionId: v.string(),
    paymentDate: v.number(),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("failed"),
    ),
    method: v.union(
      v.literal("cash"),
      v.literal("card"),
      v.literal("pse"),
      v.literal("daviplata"),
      v.literal("safetypay"),
    ),
  },
  mobilePushTokens: {
    uuid: v.string(),
    userId: v.string(),
    token: v.string(),
  },
  notifications: {
    uuid: v.string(),
    type: v.union(v.literal("email"), v.literal("push"), v.literal("sms")),
    reason: v.union(
      v.literal("appointment_reminder"),
      v.literal("appointment_cancelled"),
      v.literal("appointment_rescheduled"),
      v.literal("appointment_no_show"),
      v.literal("appointment_confirmed"),
    ),
    title: v.string(),
    body: v.string(),
    preview: v.optional(v.string()),
    senderUserId: v.string(),
    receiverUserId: v.string(),
  },
};
