// This file contains the Better Auth schema with organization support.
// Base schema auto-generated, organization tables added manually.
// To regenerate base schema: `npx @better-auth/cli generate --output convex/authSchema.ts -y`

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const tables = {
  user: defineTable({
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
    userId: v.optional(v.union(v.null(), v.string())),
    twoFactorEnabled: v.optional(v.union(v.null(), v.boolean())),
    // Polar customer ID (added for subscription management)
    customerId: v.optional(v.union(v.null(), v.string())),
  })
    .index("email_name", ["email", "name"])
    .index("name", ["name"])
    .index("userId", ["userId"])
    .index("customerId", ["customerId"]),
  session: defineTable({
    expiresAt: v.number(),
    token: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    ipAddress: v.optional(v.union(v.null(), v.string())),
    userAgent: v.optional(v.union(v.null(), v.string())),
    userId: v.string(),
    // Organization support - active organization for this session
    activeOrganizationId: v.optional(v.union(v.null(), v.string())),
  })
    .index("expiresAt", ["expiresAt"])
    .index("expiresAt_userId", ["expiresAt", "userId"])
    .index("token", ["token"])
    .index("userId", ["userId"])
    .index("activeOrganizationId", ["activeOrganizationId"]),
  account: defineTable({
    accountId: v.string(),
    providerId: v.string(),
    userId: v.string(),
    accessToken: v.optional(v.union(v.null(), v.string())),
    refreshToken: v.optional(v.union(v.null(), v.string())),
    idToken: v.optional(v.union(v.null(), v.string())),
    accessTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
    refreshTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
    scope: v.optional(v.union(v.null(), v.string())),
    password: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("accountId", ["accountId"])
    .index("accountId_providerId", ["accountId", "providerId"])
    .index("providerId_userId", ["providerId", "userId"])
    .index("userId", ["userId"]),
  verification: defineTable({
    identifier: v.string(),
    value: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("expiresAt", ["expiresAt"])
    .index("identifier", ["identifier"]),
  jwks: defineTable({
    publicKey: v.string(),
    privateKey: v.string(),
    createdAt: v.number(),
    expiresAt: v.optional(v.union(v.null(), v.number())),
  }),
  passkey: defineTable({
    name: v.optional(v.union(v.null(), v.string())),
    publicKey: v.string(),
    userId: v.string(),
    credentialID: v.string(),
    counter: v.number(),
    deviceType: v.string(),
    backedUp: v.boolean(),
    transports: v.optional(v.union(v.null(), v.string())),
    createdAt: v.optional(v.union(v.null(), v.number())),
    aaguid: v.optional(v.union(v.null(), v.string())),
  })
    .index("credentialID", ["credentialID"])
    .index("userId", ["userId"]),
  twoFactor: defineTable({
    secret: v.string(),
    backupCodes: v.string(),
    userId: v.string(),
  }).index("userId", ["userId"]),

  // ============================================
  // Organization Plugin Tables (Better Auth)
  // ============================================

  organization: defineTable({
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.union(v.null(), v.string())),
    metadata: v.optional(v.union(v.null(), v.string())), // JSON string
    createdAt: v.number(),
  })
    .index("slug", ["slug"])
    .index("name", ["name"]),

  member: defineTable({
    organizationId: v.string(),
    userId: v.string(),
    role: v.string(), // "owner" | "admin" | "member"
    teamId: v.optional(v.union(v.null(), v.string())),
    createdAt: v.number(),
  })
    .index("organizationId", ["organizationId"])
    .index("userId", ["userId"])
    .index("organizationId_userId", ["organizationId", "userId"])
    .index("userId_role", ["userId", "role"]),

  invitation: defineTable({
    organizationId: v.string(),
    email: v.string(),
    role: v.string(), // "owner" | "admin" | "member"
    teamId: v.optional(v.union(v.null(), v.string())),
    status: v.string(), // "pending" | "accepted" | "rejected" | "canceled"
    expiresAt: v.number(),
    inviterId: v.string(), // userId of who sent the invite
    createdAt: v.number(),
  })
    .index("organizationId", ["organizationId"])
    .index("email", ["email"])
    .index("email_organizationId", ["email", "organizationId"])
    .index("status", ["status"]),

  // ============================================
  // Polar Subscription Tables
  // ============================================

  subscription: defineTable({
    subscriptionId: v.string(), // Polar subscription ID
    organizationId: v.string(), // Links to organization
    userId: v.string(), // Who created the subscription
    productId: v.string(), // Polar product ID
    priceId: v.optional(v.union(v.null(), v.string())),
    status: v.string(), // "active" | "canceled" | "trialing" | "past_due" | "incomplete" | "incomplete_expired" | "unpaid"
    amount: v.optional(v.union(v.null(), v.number())),
    currency: v.optional(v.union(v.null(), v.string())),
    recurringInterval: v.optional(v.union(v.null(), v.string())), // "month" | "year"
    currentPeriodStart: v.string(), // ISO date string
    currentPeriodEnd: v.optional(v.union(v.null(), v.string())), // ISO date string
    cancelAtPeriodEnd: v.boolean(),
    startedAt: v.optional(v.union(v.null(), v.string())),
    endedAt: v.optional(v.union(v.null(), v.string())),
    createdAt: v.string(), // ISO date string
    modifiedAt: v.optional(v.union(v.null(), v.string())),
    checkoutId: v.optional(v.union(v.null(), v.string())),
    metadata: v.optional(v.union(v.null(), v.string())), // JSON string
    customerCancellationReason: v.optional(v.union(v.null(), v.string())),
    customerCancellationComment: v.optional(v.union(v.null(), v.string())),
  })
    .index("subscriptionId", ["subscriptionId"])
    .index("organizationId", ["organizationId"])
    .index("organizationId_status", ["organizationId", "status"])
    .index("userId", ["userId"])
    .index("status", ["status"]),
};

const schema = defineSchema(tables);

export default schema;
