// NOTE: You can remove this file. Declaring the shape
// of the database is entirely optional in Convex.
// See https://docs.convex.dev/database/schemas.

import { defineSchema, defineTable } from "convex/server";

import { tables } from "./tables";

export default defineSchema(
  {
    userProfileData: defineTable({
      ...tables.userProfileData,
    })
      .index("by_userId", ["userId"])
      .index("by_email", ["email"])
      .index("by_phoneNumber", ["phoneNumber"])
      .index("by_uuid", ["uuid"]),
    barbershops: defineTable({
      ...tables.barbershops,
    })
      .index("by_ownerId", ["ownerId"])
      .index("by_city_and_state", ["city", "state"])
      .index("by_isActive", ["isActive"])
      .searchIndex("by_name_search", {
        searchField: "name",
        filterFields: ["isActive"],
      })
      .index("by_uuid", ["uuid"]),

    barbershopMetadata: defineTable({
      ...tables.barbershopMetadata,
    }).index("by_barbershopId", ["barbershopId"]),

    barbershopMembers: defineTable({
      ...tables.barbershopMembers,
    })
      .index("by_userId", ["userId"])
      .index("by_barbershopId", ["barbershopId"])
      .index("by_uuid", ["uuid"])
      .index("by_isActive", ["isActive"])
      .index("by_role", ["role"]),

    services: defineTable({
      ...tables.services,
    })
      .index("by_barbershopId", ["barbershopId"])
      .searchIndex("by_name_search_idx", { searchField: "name" })
      .index("by_uuid", ["uuid"]),

    reviews: defineTable({
      ...tables.reviews,
    })
      .index("by_userId", ["userId"])
      .index("by_barbershopId", ["barbershopId"]),

    appointments: defineTable({
      ...tables.appointments,
    })
      .index("by_uuid", ["uuid"])
      .index("by_userId", ["userId"])
      .index("by_barbershopId", ["barbershopId"])
      .index("by_userIdAndBarbershopId", ["userId", "barbershopId"])
      .index("by_serviceId", ["serviceId"])
      .index("by_barbershopMemberId", ["barbershopMemberId"])
      .index("by_status", ["status"])
      .index("by_date", ["date"]),

    payments: defineTable({
      ...tables.payments,
    })
      .index("by_appointmentId", ["appointmentId"])
      .index("by_transactionId", ["transactionId"])
      .index("by_status", ["status"])
      .index("by_method", ["method"]),

    notifications: defineTable({
      ...tables.notifications,
    })
      .index("by_uuid", ["uuid"])
      .index("by_senderUserId", ["senderUserId"])
      .index("by_receiverUserId", ["receiverUserId"])
      .index("by_channels", ["channels"])
      .index("by_reason", ["reason"])
      .index("by_appointmentId", ["appointmentId"]),
  },
  { schemaValidation: true },
);
