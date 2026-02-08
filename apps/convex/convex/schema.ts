// Schema definition for PanaBarbero
// Includes Better Auth tables (with organization support) and app-specific tables
// See https://docs.convex.dev/database/schemas

import { defineSchema, defineTable } from "convex/server";

import { tables as authTables } from "./authSchema";
import { tables } from "./tables";

export default defineSchema(
  {
    // Better Auth tables (user, session, account, verification, jwks, passkey, twoFactor)
    // Plus organization tables (organization, member, invitation, subscription)
    ...authTables,

    // Extended user profile data
    userProfileData: defineTable({
      ...tables.userProfileData,
    })
      .index("by_userId", ["userId"])
      .index("by_email", ["email"])
      .index("by_phoneNumber", ["phoneNumber"])
      .index("by_uuid", ["uuid"]),

    // Barbershops - now linked to organizations
    barbershops: defineTable({
      ...tables.barbershops,
    })
      // DEPRECATED: by_ownerId - kept for migration, use by_organizationId
      .index("by_ownerId", ["ownerId"])
      // NEW: Organization-based ownership
      .index("by_organizationId", ["organizationId"])
      .index("by_city_and_state", ["city", "state"])
      .index("by_isActive", ["isActive"])
      .searchIndex("by_name_search", {
        searchField: "name",
        filterFields: ["isActive"],
      })
      .index("by_uuid", ["uuid"]),

    // Barbershop metadata
    barbershopMetadata: defineTable({
      ...tables.barbershopMetadata,
    }).index("by_barbershopId", ["barbershopId"]),

    // Barbershop members (barbers assigned to specific barbershops)
    barbershopMembers: defineTable({
      ...tables.barbershopMembers,
    })
      // DEPRECATED: by_userProfileDataId - kept for migration, use by_userId
      .index("by_userProfileDataId", ["userProfileDataId"])
      // NEW: Direct user reference
      .index("by_userId", ["userId"])
      // NEW: Organization-based queries
      .index("by_organizationId", ["organizationId"])
      .index("by_barbershopId", ["barbershopId"])
      .index("by_uuid", ["uuid"])
      .index("by_isActive", ["isActive"]),

    // Services offered by barbershops
    services: defineTable({
      ...tables.services,
    })
      .index("by_barbershopId", ["barbershopId"])
      .searchIndex("by_name_search_idx", { searchField: "name" })
      .index("by_uuid", ["uuid"]),

    // Customer reviews
    reviews: defineTable({
      ...tables.reviews,
    })
      .index("by_userId", ["userId"])
      .index("by_barbershopId", ["barbershopId"]),

    // Appointments
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

    // Barber-service assignments
    barbershopMemberServices: defineTable({
      ...tables.barbershopMemberServices,
    })
      .index("by_uuid", ["uuid"])
      .index("by_barbershopMemberId", ["barbershopMemberId"])
      .index("by_barbershopId", ["barbershopId"])
      .index("by_serviceId", ["serviceId"]),

    // Barber invitations (separate from org invitations)
    // Note: better-auth's `invitation` table handles org-level invites
    // This table handles barbershop-specific barber invitations
    barbershopInvitations: defineTable({
      ...tables.barbershopInvitations,
    })
      .index("by_barbershopId", ["barbershopId"])
      .index("by_email", ["email"])
      .index("by_code", ["code"])
      .index("by_status", ["status"]),
  },
  { schemaValidation: true },
);
