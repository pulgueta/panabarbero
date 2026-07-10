/** Pure Mercado Pago payment-state normalization shared by billing flows. */

const REVERSED_STATUSES = new Set([
  "refunded",
  "charged_back",
  "cancelled",
  "canceled",
]);

const ENTITLING_STATUSES = new Set([
  "approved",
  "reimbursed",
  "partially_refunded",
]);

interface PaymentStateInput {
  status: string;
  statusDetail?: string;
  transactionAmount: number;
  refundedAmount: number;
}

export interface PaymentFinancialState {
  canonicalStatus: string;
  entitling: boolean;
  reversed: boolean;
  refundedRatio: number;
}

/** Normalize provider payment fields into the financial state the app applies. */
export function classifyPaymentState(
  input: PaymentStateInput,
): PaymentFinancialState {
  const reimbursedChargeback =
    input.status === "charged_back" && input.statusDetail === "reimbursed";

  if (reimbursedChargeback || input.status === "reimbursed") {
    return {
      canonicalStatus: "reimbursed",
      entitling: true,
      reversed: false,
      refundedRatio: 0,
    };
  }

  if (REVERSED_STATUSES.has(input.status)) {
    return {
      canonicalStatus: input.status,
      entitling: false,
      reversed: true,
      refundedRatio: 1,
    };
  }

  if (input.status === "approved" || input.status === "partially_refunded") {
    const refundedRatio =
      input.transactionAmount > 0
        ? Math.min(
            1,
            Math.max(0, input.refundedAmount) / input.transactionAmount,
          )
        : 0;

    if (refundedRatio >= 1) {
      return {
        canonicalStatus: "refunded",
        entitling: false,
        reversed: true,
        refundedRatio: 1,
      };
    }

    return {
      canonicalStatus: refundedRatio > 0 ? "partially_refunded" : "approved",
      entitling: true,
      reversed: false,
      refundedRatio,
    };
  }

  return {
    canonicalStatus: input.status,
    entitling: false,
    reversed: false,
    refundedRatio: 0,
  };
}

export function isEntitlingPaymentStatus(status: string) {
  return ENTITLING_STATUSES.has(status);
}

export function isReversedPaymentStatus(status: string) {
  return REVERSED_STATUSES.has(status);
}

interface CreditTransitionInput extends PaymentStateInput {
  credits: number;
  availableCredits: number;
  previouslyGranted: boolean;
  previousRefundedCredits?: number;
  previousReversedCredits?: number;
  wasEverGranted: boolean;
}

export interface CreditPaymentTransition {
  canonicalStatus: string;
  balanceDelta: number;
  purchasedTotalDelta: number;
  refundedCredits?: number;
  reversedCredits?: number;
  granted: boolean;
  markPurchased: boolean;
}

/**
 * Convert a cumulative monetary refund into the matching cumulative credit
 * entitlement without restoring credits that were already consumed.
 */
export function calculateCreditPaymentTransition(
  input: CreditTransitionInput,
): CreditPaymentTransition {
  const financial = classifyPaymentState(input);
  const unchanged = {
    canonicalStatus: financial.canonicalStatus,
    balanceDelta: 0,
    purchasedTotalDelta: 0,
    refundedCredits: input.previousRefundedCredits,
    reversedCredits: input.previousReversedCredits,
    granted: input.previouslyGranted,
    markPurchased: false,
  };

  if (!financial.entitling && !financial.reversed) {
    return unchanged;
  }

  const previousRefundedCredits =
    input.previousRefundedCredits ??
    (input.previouslyGranted ? 0 : input.credits);
  const refundedCredits = financial.reversed
    ? input.credits
    : Math.min(
        input.credits,
        Math.ceil(input.credits * financial.refundedRatio),
      );
  const activeCreditsDelta = previousRefundedCredits - refundedCredits;
  let reversedCredits = input.previousReversedCredits ?? 0;
  let balanceDelta = 0;

  if (activeCreditsDelta < 0) {
    const removable = Math.min(
      Math.max(input.availableCredits, 0),
      -activeCreditsDelta,
    );
    balanceDelta = -removable;
    reversedCredits += removable;
  } else if (activeCreditsDelta > 0) {
    const restorable = input.wasEverGranted
      ? Math.min(activeCreditsDelta, reversedCredits)
      : activeCreditsDelta;
    balanceDelta = restorable;
    reversedCredits -= restorable;
  }

  return {
    canonicalStatus: financial.canonicalStatus,
    balanceDelta,
    purchasedTotalDelta: activeCreditsDelta,
    refundedCredits,
    reversedCredits: reversedCredits > 0 ? reversedCredits : undefined,
    granted: refundedCredits < input.credits,
    markPurchased: refundedCredits < input.credits && !input.wasEverGranted,
  };
}
