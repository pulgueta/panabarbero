// NOTE: You can remove this file. Declaring the shape
// of the database is entirely optional in Convex.
// See https://docs.convex.dev/database/schemas.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema(
  {
    barbershops: defineTable({
      name: v.string(),
      description: v.optional(v.string()),
      organizationId: v.string(),
      address: v.string(),
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
    })
      .index("by_ownerId", ["ownerId"])
      .index("by_city_and_state", ["city", "state"])
      .index("by_organizationId", ["organizationId"]),

    barbers: defineTable({
      userId: v.string(),
      memberId: v.string(),
      barbershopId: v.string(),
    })
      .index("by_userId", ["userId"])
      .index("by_barbershopId", ["barbershopId"])
      .index("by_memberId", ["memberId"]),

    services: defineTable({
      name: v.string(),
      description: v.optional(v.string()),
      price: v.number(),
      duration: v.optional(v.number()),
      nameVector: v.optional(v.array(v.float64())),
      barbershopId: v.string(),
    })
      .index("by_barbershopId", ["barbershopId"])
      .vectorIndex("name_vector_idx", {
        dimensions: 1536,
        vectorField: "nameVector",
        filterFields: ["name"],
      }),

    reviews: defineTable({
      rating: v.number(),
      comment: v.optional(v.string()),
      userId: v.string(),
      barbershopId: v.string(),
    })
      .index("by_userId", ["userId"])
      .index("by_barbershopId", ["barbershopId"]),

    appointments: defineTable({
      userId: v.string(),
      barbershopId: v.string(),
      serviceId: v.string(),
      barberId: v.string(),
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
    })
      .index("by_userId", ["userId"])
      .index("by_barbershopId", ["barbershopId"])
      .index("by_serviceId", ["serviceId"])
      .index("by_barberId", ["barberId"])
      .index("by_status", ["status"]),

    payments: defineTable({
      appointmentId: v.string(),
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
    })
      .index("by_appointmentId", ["appointmentId"])
      .index("by_status", ["status"])
      .index("by_method", ["method"]),

    notifications: defineTable({
      type: v.union(v.literal("email"), v.literal("push"), v.literal("sms")),
      reason: v.union(
        v.literal("appointment_reminder"),
        v.literal("appointment_cancelled"),
        v.literal("appointment_rescheduled"),
        v.literal("appointment_no_show"),
        v.literal("appointment_confirmed"),
      ),
      text: v.string(),
      senderUserId: v.string(),
      receiverUserId: v.string(),
    }),

    mobile_push_tokens: defineTable({
      userId: v.string(),
      token: v.string(),
    }).index("by_userId", ["userId"]),
  },
  { schemaValidation: true },
);
