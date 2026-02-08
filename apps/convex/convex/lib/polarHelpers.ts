import type { Subscription } from "@polar-sh/sdk/models/components/subscription";

/**
 * Subscription data structure for database storage
 */
export interface DatabaseSubscription {
  subscriptionId: string;
  organizationId: string;
  userId: string;
  productId: string;
  priceId: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
  recurringInterval: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  modifiedAt: string | null;
  checkoutId: string | null;
  metadata: string | null;
  customerCancellationReason: string | null;
  customerCancellationComment: string | null;
}

/**
 * Converts a Polar subscription to our database format
 * The organizationId is extracted from the subscription metadata.referenceId
 * which is passed during checkout
 */
export const convertToDatabaseSubscription = (
  subscription: Subscription,
): DatabaseSubscription => {
  // Extract organizationId from subscription metadata (set as referenceId during checkout)
  const organizationId = subscription.metadata?.referenceId as string;

  if (!organizationId) {
    throw new Error(
      "Subscription missing organizationId in metadata.referenceId. " +
        "Ensure you pass referenceId: organizationId when creating the checkout.",
    );
  }

  // Get the user ID from the customer's externalId (set during customer creation)
  const userId = subscription.customer.externalId;

  if (!userId) {
    throw new Error(
      "Subscription customer missing externalId. " +
        "Ensure the Polar customer was created with externalId: userId.",
    );
  }

  return {
    subscriptionId: subscription.id,
    organizationId,
    userId,
    productId: subscription.productId,
    priceId: (subscription as unknown as { priceId?: string }).priceId ?? null,
    status: subscription.status,
    amount: subscription.amount ?? null,
    currency: subscription.currency ?? null,
    recurringInterval: subscription.recurringInterval ?? null,
    currentPeriodStart: subscription.currentPeriodStart.toISOString(),
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    startedAt: subscription.startedAt?.toISOString() ?? null,
    endedAt: subscription.endedAt?.toISOString() ?? null,
    createdAt: subscription.createdAt.toISOString(),
    modifiedAt: subscription.modifiedAt?.toISOString() ?? null,
    checkoutId: subscription.checkoutId ?? null,
    metadata: subscription.metadata
      ? JSON.stringify(subscription.metadata)
      : null,
    customerCancellationReason: subscription.customerCancellationReason ?? null,
    customerCancellationComment:
      subscription.customerCancellationComment ?? null,
  };
};

/**
 * Helper to check if a subscription status is considered "active"
 */
export const isSubscriptionActive = (status: string): boolean => {
  return ["active", "trialing"].includes(status);
};

/**
 * Helper to check if a subscription is in a "failed" state
 */
export const isSubscriptionFailed = (status: string): boolean => {
  return ["past_due", "incomplete", "incomplete_expired", "unpaid"].includes(
    status,
  );
};
