import { defineSchema } from "convex/server";
import type { output } from "zod";
import { z } from "zod";

import { zodTable } from ".";

export const userProfileData = zodTable("userProfileData", () => ({
  userId: z.string(),
  email: z.string(),
  name: z.string().optional(),
  /** R2 profile photo URL. App-level only — WorkOS users can't store pictures via API. */
  image: z.string().optional(),
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
  /** WorkOS Organization mirroring this barbershop; synced on create/rename/deactivate/delete. */
  workosOrganizationId: z.string().optional(),
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
  /** Owner-set geographic location, also indexed in the geospatial component. */
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
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
  roles: z.enum(["owner", "barber", "staff"]).array(),
  /** Per-barber schedule override. When undefined, inherits barbershop hours. */
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
    .array()
    .optional(),
}));

export const services = zodTable("services", (id) => ({
  name: z
    .string({ error: "El nombre es requerido" })
    .min(3, { error: "El nombre debe tener al menos 3 caracteres" })
    .max(255, { error: "El nombre debe tener menos de 255 caracteres" })
    .trim(),
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
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  userId: z.string(),
  barbershopId: id("barbershops"),
  /** The completed appointment this review is tied to (one review per visit). */
  appointmentId: id("appointments"),
  serviceId: id("services"),
  /** Service name snapshot — survives later service renames/deletion. */
  serviceName: z.string(),
  /** Reviewer display-name snapshot at submission time. */
  authorName: z.string(),
  /**
   * Set once AI moderation clears the review. A review is public (shown in the
   * barbershop feed) and counted in the rating aggregate IFF this is set and
   * `flaggedAt` is not. Timestamp instead of a boolean, by design.
   */
  publishedAt: z.number().optional(),
  /**
   * Set when AI moderation flags the comment as abusive/hateful/defamatory.
   * Flagged reviews stay unpublished and surface in the author's "Reseñas" tab
   * for correction or deletion.
   */
  flaggedAt: z.number().optional(),
  /** Short Spanish explanation shown to the author when a review is flagged. */
  moderationReason: z.string().optional(),
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
    // create() normalizes via formatPhoneNumber to E.164 (e.g. +57XXXXXXXXXX =
    // 13 chars, up to 16 for other country codes), so the stored value is
    // longer than 10. Pinning exactly 10 rejected every insert; allow the
    // E.164 range instead.
    .min(10, "El teléfono debe tener al menos 10 caracteres")
    .max(16, "El teléfono no es válido"),
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
  createdBy: id("barbershopMembers").optional(),
  notes: z.string().optional(),
  deletedAt: z.number().optional(),
  upcomingNotificationId: id("_scheduled_functions").optional(),
  pastReminderNotificationId: id("_scheduled_functions").optional(),
  /**
   * Single-use review token minted when this appointment is marked completed
   * (only for authenticated customers). Consumed when the review is created.
   */
  reviewCode: z.uuidv4().optional(),
  reviewCodeIssuedAt: z.number().optional(),
  reviewCodeRedeemedAt: z.number().optional(),
  /**
   * Stamped when the customer's review for this visit is created. Durable —
   * it survives review deletion, so one review per completed visit holds even
   * after the author deletes theirs.
   */
  reviewedAt: z.number().optional(),
  /**
   * Service price + name snapshotted when this appointment is marked completed,
   * so the analytics breakdown survives later service edits/deletion (services
   * are hard-deleted; the revenue aggregate already snapshots price the same
   * way). Undefined for rows completed before this field existed — the
   * breakdown falls back to the live service, then 0 / "Servicio".
   */
  completedServicePrice: z.number().optional(),
  completedServiceName: z.string().optional(),
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

export const usage = zodTable("usage", (id) => ({
  barbershopId: id("barbershops"),
  month: z.string(),
  smsSent: z.number(),
  emailsSent: z.number(),
}));

/**
 * Remaining purchased credits per barbershop.
 * One row per barbershop — upserted when credits are purchased,
 * decremented when plan quota is exceeded and extra credits are consumed.
 */
export const extraCredits = zodTable("extraCredits", (id) => ({
  barbershopId: id("barbershops"),
  smsCredits: z.number(),
  emailCredits: z.number(),
  /** Cumulative SMS credits ever purchased — used as the progress-bar ceiling. */
  smsPurchasedTotal: z.number(),
  /** Cumulative email credits ever purchased — used as the progress-bar ceiling. */
  emailPurchasedTotal: z.number(),
}));

/**
 * Individual credit purchase records — used for idempotency (deduplicate
 * webhook retries) and purchase history.
 */
export const creditPurchases = zodTable("creditPurchases", (id) => ({
  orderId: z.string(),
  barbershopId: id("barbershops"),
  type: z.enum(["sms", "email"]),
  amount: z.number(),
  purchasedAt: z.number(),
}));

export const notificationKinds = [
  "appointment_created",
  "barber_appointment_created",
  "appointment_cancelled",
  "appointment_reschedule_request",
  "appointment_reschedule_accepted",
  "appointment_reschedule_denied",
  "appointment_reminder",
  "past_appointment_reminder",
  "team_invited",
  "barber_removed_cancellation",
  "service_deleted_cancellation",
  "review_invite",
  "review_needs_attention",
  "low_stock",
] as const;

export const notificationKindSchema = z.enum(notificationKinds);

/**
 * In-app notification inbox rows. One row per recipient; copy is rendered
 * server-side so SMS, email and in-app stay in sync.
 */
export const inAppNotifications = zodTable("inAppNotifications", (id) => ({
  userId: z.string(),
  kind: notificationKindSchema,
  title: z.string(),
  description: z.string(),
  payload: z
    .object({
      appointmentId: id("appointments").optional(),
      barbershopId: id("barbershops").optional(),
      barbershopName: z.string().optional(),
      barberName: z.string().optional(),
      customerName: z.string().optional(),
      serviceName: z.string().optional(),
      invitationCode: z.string().optional(),
      notes: z.string().optional(),
      reviewId: id("reviews").optional(),
      barbershopUuid: z.string().optional(),
      reviewCode: z.string().optional(),
      itemName: z.string().optional(),
      itemUnit: z.string().optional(),
      remaining: z.number().optional(),
    })
    .optional(),
}));

export const inventoryCategories = [
  "drink",
  "blade",
  "machine",
  "spray",
  "alcohol",
  "tool",
  "consumable",
  "retail",
  "ppe",
  "cleaning",
  "linen",
  "other",
] as const;

/**
 * Equipment lives in the same table as stock but is never consumed, sold or
 * wasted — clippers survive the haircut. Guards in `convex/inventory.ts` and
 * the UI both key off this set.
 */
export const inventoryEquipmentCategories = ["machine", "tool"] as const;

export function isEquipmentCategory(
  category: (typeof inventoryCategories)[number],
): boolean {
  return (inventoryEquipmentCategories as readonly string[]).includes(category);
}

export const inventoryStockBehaviors = ["consumable", "durable"] as const;

/**
 * Quantities are ALWAYS integers in the item's unit. Liquids/weights use
 * integer base units (ml, g) — a 1L bottle is 1000 ml. No floats, no drift.
 */
export const inventoryUnits = ["unit", "ml", "g", "box", "pack"] as const;

/** What one purchasable package contains for receive-time conversion and display. */
export const inventoryPresentationUnits = ["ml", "g", "und"] as const;

export const inventoryMovementTypes = [
  "receipt",
  "sale",
  "consumption",
  "adjustment",
  "waste",
  "return",
  "reservation",
  "release",
  "transfer_in",
  "transfer_out",
] as const;

export const inventoryMovementTypeSchema = z.enum(inventoryMovementTypes);

/** Item definition — no quantities live here (those are on `inventoryLevels`). */
export const inventoryItems = zodTable("inventoryItems", (id) => ({
  barbershopId: id("barbershops"),
  name: z
    .string({ error: "El nombre es requerido" })
    .min(2, { error: "El nombre debe tener al menos 2 caracteres" })
    .max(120, { error: "El nombre debe tener menos de 120 caracteres" })
    .trim(),
  sku: z.string().max(64).trim().optional(),
  category: z.enum(inventoryCategories, {
    error: "La categoría es requerida",
  }),
  unit: z.enum(inventoryUnits, { error: "La unidad es requerida" }),
  stockBehavior: z.enum(inventoryStockBehaviors).default("consumable"),
  brand: z.string().max(80).trim().optional(),
  supplier: z.string().max(120).trim().optional(),
  customLabel: z.string().max(60).trim().optional(),
  /**
   * Presentation: what one purchasable package contains ("frasco de 500 ml",
   * "caja x 100 und"). Stock math always runs in `unit`; receive UI may
   * convert package counts into the base stock unit.
   */
  presentationValue: z.coerce.number().int().positive().optional(),
  presentationUnit: z.enum(inventoryPresentationUnits).optional(),
  /** Equipment sheet (machines/tools): identity + lifecycle, not stock. */
  model: z.string().max(80).trim().optional(),
  serialNumber: z.string().max(80).trim().optional(),
  purchasedAt: z.number().optional(),
  warrantyUntil: z.number().optional(),
  notes: z.string().max(300).trim().optional(),
  isSellable: z.boolean().default(false),
  /** COP integer pesos. Weighted moving average, updated on each receipt. */
  unitCost: z.coerce
    .number({ error: "El costo es requerido" })
    .int({ error: "El costo debe ser un número entero" })
    .min(0, { error: "El costo no puede ser negativo" }),
  salePrice: z.coerce
    .number()
    .int({ error: "El precio debe ser un número entero" })
    .min(1000, { error: "El precio debe ser mayor a $1.000" })
    .optional(),
  reorderPoint: z.coerce
    .number()
    .int({ error: "El punto de pedido debe ser un número entero" })
    .min(0, { error: "El punto de pedido no puede ser negativo" })
    .default(0),
  reorderQuantity: z.coerce.number().int().min(1).optional(),
  /** Reject stock-decrements below zero by default; per-item opt-in. */
  allowNegativeStock: z.boolean().default(false),
  /** R2 object key — never a URL or blob. */
  imageKey: z.string().optional(),
  /** Archive = soft delete. Ledger rows and snapshots keep history readable. */
  deletedAt: z.number().optional(),
}));

/**
 * Running balance per (item, location) — the hot O(1) read. Only
 * `recordMovement` in `convex/inventory.ts` may write these rows, and only
 * through the trigger-wrapped db so the aggregates stay in sync.
 * `available = onHand - reserved`, always computed, never stored.
 */
export const inventoryLevels = zodTable("inventoryLevels", (id) => ({
  barbershopId: id("barbershops"),
  itemId: id("inventoryItems"),
  /** undefined = main location. Multi-location seam; UI is single-location. */
  locationId: z.string().optional(),
  onHand: z.number().int(),
  reserved: z.number().int().default(0),
  /** Denormalized from the item so the valuation aggregate's sumValue (onHand * unitCost) lives on this doc. */
  unitCost: z.number().int().min(0),
  /** Denormalized: onHand <= item.reorderPoint. */
  belowReorder: z.boolean(),
  /** Alert hysteresis: stamped on the downward crossing, cleared on recovery. */
  lowStockAlertedAt: z.number().optional(),
}));

/**
 * Append-only movement ledger — the source of truth, never edited.
 * `quantity` is a positive magnitude for every type EXCEPT `adjustment`,
 * which stores the signed delta. Per-balance effects derive from the
 * `movementEffects` matrix in `convex/inventory.ts`.
 */
export const inventoryMovements = zodTable("inventoryMovements", (id) => ({
  barbershopId: id("barbershops"),
  itemId: id("inventoryItems"),
  /** Snapshot — history survives item renames and archival. */
  itemName: z.string(),
  locationId: z.string().optional(),
  type: inventoryMovementTypeSchema,
  quantity: z.number().int(),
  /** Cost snapshot at write time — historical valuation survives cost changes. */
  unitCostAtTime: z.number().int(),
  /** Sale price snapshot at write time — retail history survives price edits. */
  salePriceAtTime: z.number().int().optional(),
  /** onHand after applying this movement — O(1) audit and reconcile anchor. */
  balanceAfter: z.number().int(),
  reason: z.string().max(300).optional(),
  actorUserId: z.string(),
  relatedAppointmentId: id("appointments").optional(),
  /** Dedupe for webhook/import-originated movements (creditPurchases.orderId pattern). */
  idempotencyKey: z.string().optional(),
}));

/**
 * Per-service consumption recipe: booking auto-reserves these lines,
 * completion auto-consumes, every cancellation path auto-releases.
 */
export const serviceInventoryUsage = zodTable(
  "serviceInventoryUsage",
  (id) => ({
    barbershopId: id("barbershops"),
    serviceId: id("services"),
    itemId: id("inventoryItems"),
    /** In the item's unit. */
    quantity: z.coerce
      .number({ error: "La cantidad es requerida" })
      .int({ error: "La cantidad debe ser un número entero" })
      .min(1, { error: "La cantidad debe ser mayor a 0" }),
  }),
);

/** Retention rollup target: pruned ledger months survive here. Bogotá-local month keys. */
export const inventoryMovementSummaries = zodTable(
  "inventoryMovementSummaries",
  (id) => ({
    barbershopId: id("barbershops"),
    itemId: id("inventoryItems"),
    itemName: z.string(),
    /** "YYYY-MM", America/Bogota. */
    month: z.string(),
    type: inventoryMovementTypeSchema,
    totalQuantity: z.number().int(),
    /** Σ quantity * unitCostAtTime over the rolled-up rows. */
    totalCost: z.number().int(),
  }),
);

/**
 * MercadoPago subscriptions — the parallel (test) subscription store that can
 * replace Polar without removing it. One row per user subscription attempt;
 * `getCurrentMpSubscription` picks the effective one. Paid rows carry a
 * `preapprovalId`; the free plan is a local row with no remote counterpart.
 */
export const mercadopagoSubscriptions = zodTable(
  "mercadopagoSubscriptions",
  () => ({
    userId: z.string(),
    /** Shared vocabulary with `convex/plans.ts` — drives the plan tier. */
    productKey: z.string(),
    /** App-normalized status (matches Polar's `active`/`trialing` gate vocabulary). */
    status: z.enum(["active", "pending", "paused", "canceled", "trialing"]),
    /** Raw MercadoPago preapproval status (authorized/pending/paused/cancelled). */
    mpStatus: z.string().optional(),
    /** MercadoPago preapproval id. Absent for the free plan. */
    preapprovalId: z.string().optional(),
    payerEmail: z.string().optional(),
    reason: z.string().optional(),
    /** Amount charged per cycle, in whole COP pesos. */
    amount: z.number().optional(),
    currencyId: z.string().optional(),
    /** Hosted checkout URL returned for a pending preapproval. */
    initPoint: z.string().optional(),
    /** `<userId>|<productKey>` — lets the webhook map a preapproval back to us. */
    externalReference: z.string().optional(),
    /** ISO date of the next scheduled charge, when known. */
    nextPaymentDate: z.string().optional(),
    updatedAt: z.number(),
  }),
);

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
    .index("by_uuid", ["uuid"])
    .index("by_workosOrganizationId", ["workosOrganizationId"]),

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
    .index("by_userId_and_flaggedAt", ["userId", "flaggedAt"])
    .index("by_barbershopId", ["barbershopId"])
    .index("by_barbershopId_and_publishedAt", ["barbershopId", "publishedAt"])
    .index("by_barbershopId_and_rating", ["barbershopId", "rating"])
    .index("by_barbershopId_and_flaggedAt", ["barbershopId", "flaggedAt"])
    .index("by_barbershopId_and_publishedAt_and_flaggedAt", [
      "barbershopId",
      "publishedAt",
      "flaggedAt",
    ])
    .index("by_appointmentId", ["appointmentId"]),

  appointments: appointments
    .table()
    .index("by_userId", ["userId"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_barbershopId", ["barbershopId"])
    .index("by_userIdAndBarbershopId", ["userId", "barbershopId"])
    .index("by_serviceId", ["serviceId"])
    .index("by_barbershopMemberId", ["barbershopMemberId"])
    .index("by_status", ["status"])
    .index("by_date", ["date"])
    .index("by_barbershopId_and_date", ["barbershopId", "date"])
    .index("by_deletedAt", ["deletedAt"])
    .index("by_reviewCode", ["reviewCode"]),

  barbershopMemberServices: barbershopMemberServices
    .table()
    .index("by_uuid", ["uuid"])
    .index("by_barbershopMemberId", ["barbershopMemberId"])
    .index("by_barbershopId", ["barbershopId"])
    .index("by_serviceId", ["serviceId"]),

  usage: usage.table().index("by_barbershop_month", ["barbershopId", "month"]),

  extraCredits: extraCredits.table().index("by_barbershopId", ["barbershopId"]),

  creditPurchases: creditPurchases
    .table()
    .index("by_orderId", ["orderId"])
    .index("by_barbershopId", ["barbershopId"]),

  inAppNotifications: inAppNotifications
    .table()
    .index("by_user_created", ["userId"]),

  inventoryItems: inventoryItems
    .table()
    .index("by_barbershopId", ["barbershopId"])
    .index("by_barbershopId_and_category", ["barbershopId", "category"])
    .index("by_barbershopId_and_deletedAt", ["barbershopId", "deletedAt"])
    .index("by_barbershopId_and_category_and_deletedAt", [
      "barbershopId",
      "category",
      "deletedAt",
    ]),

  inventoryLevels: inventoryLevels
    .table()
    .index("by_barbershopId", ["barbershopId"])
    .index("by_itemId", ["itemId"])
    .index("by_barbershopId_and_belowReorder", [
      "barbershopId",
      "belowReorder",
    ]),

  inventoryMovements: inventoryMovements
    .table()
    .index("by_itemId", ["itemId"])
    .index("by_barbershopId", ["barbershopId"])
    .index("by_barbershopId_and_idempotencyKey", [
      "barbershopId",
      "idempotencyKey",
    ])
    .index("by_relatedAppointmentId", ["relatedAppointmentId"]),

  serviceInventoryUsage: serviceInventoryUsage
    .table()
    .index("by_serviceId", ["serviceId"])
    .index("by_itemId", ["itemId"])
    .index("by_barbershopId", ["barbershopId"]),

  inventoryMovementSummaries: inventoryMovementSummaries
    .table()
    .index("by_barbershopId_and_month", ["barbershopId", "month"])
    .index("by_itemId_and_month", ["itemId", "month"]),

  mercadopagoSubscriptions: mercadopagoSubscriptions
    .table()
    .index("by_userId", ["userId"])
    .index("by_preapprovalId", ["preapprovalId"]),
});

export type UserProfileData = output<typeof userProfileData.schema>;
export type Barbershop = output<typeof barbershops.schema>;
export type BarbershopMetadata = output<typeof barbershopMetadata.schema>;
export type BarbershopMember = output<typeof barbershopMembers.schema>;
export type BarbershopMemberWithName = BarbershopMember & {
  name: string;
  avatarUrl: string;
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
export type Usage = output<typeof usage.schema>;
export type ExtraCredits = output<typeof extraCredits.schema>;
export type CreditPurchase = output<typeof creditPurchases.schema>;
export type InAppNotification = output<typeof inAppNotifications.schema>;
export type NotificationKind = (typeof notificationKinds)[number];
export type InventoryItem = output<typeof inventoryItems.schema>;
export type InventoryLevel = output<typeof inventoryLevels.schema>;
export type InventoryMovement = output<typeof inventoryMovements.schema>;
export type InventoryMovementType = (typeof inventoryMovementTypes)[number];
export type InventoryCategory = (typeof inventoryCategories)[number];
export type InventoryUnit = (typeof inventoryUnits)[number];
export type InventoryStockBehavior = (typeof inventoryStockBehaviors)[number];
export type InventoryPresentationUnit =
  (typeof inventoryPresentationUnits)[number];
export type ServiceInventoryUsage = output<typeof serviceInventoryUsage.schema>;
export type InventoryMovementSummary = output<
  typeof inventoryMovementSummaries.schema
>;
export type MercadopagoSubscription = output<
  typeof mercadopagoSubscriptions.schema
>;
