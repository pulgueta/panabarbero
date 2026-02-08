import { ConvexError, v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { authComponent } from "./auth";
import { getPlanTypeFromSlug, PLAN_LIMITS, type PlanConfig } from "./lib/plans";
import { getPolarClient } from "./lib/polarClient";
import { getPolarProducts } from "./lib/polarProducts";

// =============================================================================
// Internal Mutations (called from webhooks)
// =============================================================================

/**
 * Links a Polar customer ID to a user (called from webhook onCustomerCreated)
 */
export const updateUserCustomerId = internalMutation({
  args: {
    customerId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("user")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .unique();

    if (!user) {
      console.error(`User not found for userId: ${args.userId}`);
      return;
    }

    // Check for duplicate customer IDs
    const existingUser = await ctx.db
      .query("user")
      .withIndex("customerId", (q) => q.eq("customerId", args.customerId))
      .first();

    if (existingUser && existingUser._id !== user._id) {
      throw new ConvexError(
        `Another user already has Polar customer ID ${args.customerId}`,
      );
    }

    await ctx.db.patch(user._id, { customerId: args.customerId });
  },
});

/**
 * Creates a new subscription record (called from webhook onSubscriptionCreated)
 */
export const createSubscription = internalMutation({
  args: {
    subscription: v.object({
      subscriptionId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      productId: v.string(),
      priceId: v.union(v.string(), v.null()),
      status: v.string(),
      amount: v.union(v.number(), v.null()),
      currency: v.union(v.string(), v.null()),
      recurringInterval: v.union(v.string(), v.null()),
      currentPeriodStart: v.string(),
      currentPeriodEnd: v.union(v.string(), v.null()),
      cancelAtPeriodEnd: v.boolean(),
      startedAt: v.union(v.string(), v.null()),
      endedAt: v.union(v.string(), v.null()),
      createdAt: v.string(),
      modifiedAt: v.union(v.string(), v.null()),
      checkoutId: v.union(v.string(), v.null()),
      metadata: v.union(v.string(), v.null()),
      customerCancellationReason: v.union(v.string(), v.null()),
      customerCancellationComment: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    // Check if subscription already exists
    const existing = await ctx.db
      .query("subscription")
      .withIndex("subscriptionId", (q) =>
        q.eq("subscriptionId", args.subscription.subscriptionId),
      )
      .unique();

    if (existing) {
      throw new ConvexError(
        `Subscription ${args.subscription.subscriptionId} already exists`,
      );
    }

    await ctx.db.insert("subscription", args.subscription);
  },
});

/**
 * Updates an existing subscription record (called from webhook onSubscriptionUpdated)
 */
export const updateSubscription = internalMutation({
  args: {
    subscription: v.object({
      subscriptionId: v.string(),
      organizationId: v.string(),
      userId: v.string(),
      productId: v.string(),
      priceId: v.union(v.string(), v.null()),
      status: v.string(),
      amount: v.union(v.number(), v.null()),
      currency: v.union(v.string(), v.null()),
      recurringInterval: v.union(v.string(), v.null()),
      currentPeriodStart: v.string(),
      currentPeriodEnd: v.union(v.string(), v.null()),
      cancelAtPeriodEnd: v.boolean(),
      startedAt: v.union(v.string(), v.null()),
      endedAt: v.union(v.string(), v.null()),
      createdAt: v.string(),
      modifiedAt: v.union(v.string(), v.null()),
      checkoutId: v.union(v.string(), v.null()),
      metadata: v.union(v.string(), v.null()),
      customerCancellationReason: v.union(v.string(), v.null()),
      customerCancellationComment: v.union(v.string(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscription")
      .withIndex("subscriptionId", (q) =>
        q.eq("subscriptionId", args.subscription.subscriptionId),
      )
      .unique();

    if (!existing) {
      // If subscription doesn't exist, create it
      await ctx.db.insert("subscription", args.subscription);
      return { updated: false, created: true };
    }

    await ctx.db.patch(existing._id, args.subscription);
    return { updated: true, created: false };
  },
});

/**
 * Handles subscription cancellation (called from webhook onSubscriptionCanceled)
 */
export const handleCancellation = internalMutation({
  args: {
    subscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscription")
      .withIndex("subscriptionId", (q) =>
        q.eq("subscriptionId", args.subscriptionId),
      )
      .unique();

    if (!subscription) {
      console.warn(
        `Subscription ${args.subscriptionId} not found for cancellation`,
      );
      return;
    }

    await ctx.db.patch(subscription._id, {
      status: "canceled",
      endedAt: new Date().toISOString(),
    });
  },
});

// =============================================================================
// Internal Queries
// =============================================================================

/**
 * Gets the active subscription for an organization
 */
export const getActiveSubscriptionForOrg = internalQuery({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscription")
      .withIndex("organizationId_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .first();

    return subscription;
  },
});

// =============================================================================
// Public Queries
// =============================================================================

/**
 * Gets the current user's organization subscription
 */
export const getMyOrganizationSubscription = query({
  args: {
    organizationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return null;

    if (!args.organizationId) {
      return null;
    }

    const organizationId = args.organizationId;

    // Verify user is member of the organization
    const membership = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        q.eq("organizationId", organizationId).eq("userId", user._id),
      )
      .unique();

    if (!membership) {
      return null;
    }

    const subscription = await ctx.db
      .query("subscription")
      .withIndex("organizationId_status", (q) =>
        q.eq("organizationId", organizationId).eq("status", "active"),
      )
      .first();

    if (!subscription) {
      return { plan: "free" as const, limits: PLAN_LIMITS.free };
    }

    // Get products to determine plan type
    const products = await getPolarProducts();
    const product = products.find(
      (p) => p.productId === subscription.productId,
    );
    const planType = product ? getPlanTypeFromSlug(product.slug) : "free";

    return {
      subscription,
      plan: planType,
      limits: PLAN_LIMITS[planType],
    };
  },
});

/**
 * Gets plan limits for an organization
 */
export const getOrganizationPlanLimits = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args): Promise<PlanConfig> => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) return PLAN_LIMITS.free;

    const subscription = await ctx.db
      .query("subscription")
      .withIndex("organizationId_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "active"),
      )
      .first();

    if (!subscription) {
      return PLAN_LIMITS.free;
    }

    const products = await getPolarProducts();
    const product = products.find(
      (p) => p.productId === subscription.productId,
    );
    const planType = product ? getPlanTypeFromSlug(product.slug) : "free";

    return PLAN_LIMITS[planType];
  },
});

// =============================================================================
// Internal Actions (Polar API calls)
// =============================================================================

/**
 * Creates a Polar customer for a new user
 * Called from user.onCreate trigger
 */
export const createPolarCustomer = internalAction({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    userId: v.string(),
  },
  handler: async (_ctx, args) => {
    const polar = getPolarClient();
    const orgId = process.env.POLAR_ORGANIZATION_ID;

    if (!orgId) {
      console.error("POLAR_ORGANIZATION_ID is not configured");
      return;
    }

    try {
      await polar.customers.create({
        email: args.email,
        externalId: args.userId, // Links Polar customer to Convex user
        name: args.name,
        organizationId: orgId,
      });
    } catch (error) {
      console.error("Failed to create Polar customer:", error);
      // Don't throw - customer creation is non-critical
    }
  },
});

/**
 * Gets active subscriptions for a user
 */
export const getUserActiveSubscriptions = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscription")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});
