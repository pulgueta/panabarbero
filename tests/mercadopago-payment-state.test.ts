import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCreditPaymentTransition,
  classifyPaymentState,
} from "../convex/mercadopagoPaymentState.ts";
import { isWebhookTimestampWithinTolerance } from "../convex/mercadopagoWebhookSignature.ts";
import {
  getFreeTrialDays,
  hasActivePaidEntitlement,
  hasRemoteBillingActivity,
  initialTrialEndsAt,
  isExpectedFreeTrial,
  MP_FREE_TRIAL_DAYS,
  shouldBlockTrialActivation,
  trialDaysForCheckout,
} from "../convex/mercadopagoSubscriptionState.ts";

const baseCreditState = {
  credits: 1000,
  transactionAmount: 20_000,
  availableCredits: 1000,
  previouslyGranted: true,
  previousRefundedCredits: 0,
  previousReversedCredits: 0,
  wasEverGranted: true,
};

test("webhook timestamp tolerance compares Unix seconds to milliseconds safely", () => {
  const nowMs = 1_700_000_000_000;

  assert.equal(
    isWebhookTimestampWithinTolerance(
      "ts=1700000000,v1=signature",
      nowMs,
      300,
    ),
    true,
  );
  assert.equal(
    isWebhookTimestampWithinTolerance(
      "ts=1699999700,v1=signature",
      nowMs,
      300,
    ),
    true,
  );
  assert.equal(
    isWebhookTimestampWithinTolerance(
      "ts=1699999699,v1=signature",
      nowMs,
      300,
    ),
    false,
  );
  assert.equal(
    isWebhookTimestampWithinTolerance(
      "ts=1700000301,v1=signature",
      nowMs,
      300,
    ),
    false,
  );
  assert.equal(
    isWebhookTimestampWithinTolerance("v1=signature", nowMs, 300),
    false,
  );
});

test("approved, pending, and rejected payments have distinct financial states", () => {
  assert.deepEqual(
    classifyPaymentState({
      status: "approved",
      transactionAmount: 20_000,
      refundedAmount: 0,
    }),
    {
      canonicalStatus: "approved",
      entitling: true,
      reversed: false,
      refundedRatio: 0,
    },
  );

  for (const status of ["pending", "in_process", "rejected"]) {
    assert.equal(
      classifyPaymentState({
        status,
        transactionAmount: 20_000,
        refundedAmount: 0,
      }).entitling,
      false,
    );
  }
});

test("a partial refund removes only the proportional cumulative credits", () => {
  const transition = calculateCreditPaymentTransition({
    ...baseCreditState,
    status: "approved",
    refundedAmount: 5_000,
  });

  assert.equal(transition.canonicalStatus, "partially_refunded");
  assert.equal(transition.refundedCredits, 250);
  assert.equal(transition.balanceDelta, -250);
  assert.equal(transition.purchasedTotalDelta, -250);
  assert.equal(transition.granted, true);
});

test("the first approval grants the complete pack exactly once", () => {
  const transition = calculateCreditPaymentTransition({
    ...baseCreditState,
    status: "approved",
    refundedAmount: 0,
    availableCredits: 0,
    previouslyGranted: false,
    previousRefundedCredits: undefined,
    wasEverGranted: false,
  });

  assert.equal(transition.balanceDelta, 1000);
  assert.equal(transition.purchasedTotalDelta, 1000);
  assert.equal(transition.refundedCredits, 0);
  assert.equal(transition.markPurchased, true);
});

test("cumulative partial refunds apply only the new difference", () => {
  const transition = calculateCreditPaymentTransition({
    ...baseCreditState,
    status: "approved",
    refundedAmount: 10_000,
    availableCredits: 750,
    previousRefundedCredits: 250,
    previousReversedCredits: 250,
  });

  assert.equal(transition.refundedCredits, 500);
  assert.equal(transition.balanceDelta, -250);
  assert.equal(transition.purchasedTotalDelta, -250);
  assert.equal(transition.reversedCredits, 500);
});

test("a full refund removes only credits still available", () => {
  const transition = calculateCreditPaymentTransition({
    ...baseCreditState,
    status: "refunded",
    refundedAmount: 20_000,
    availableCredits: 300,
  });

  assert.equal(transition.refundedCredits, 1000);
  assert.equal(transition.balanceDelta, -300);
  assert.equal(transition.purchasedTotalDelta, -1000);
  assert.equal(transition.reversedCredits, 300);
  assert.equal(transition.granted, false);
});

test("a fully refunded approved payment is treated as a full reversal", () => {
  const state = classifyPaymentState({
    status: "approved",
    transactionAmount: 20_000,
    refundedAmount: 20_000,
  });

  assert.equal(state.canonicalStatus, "refunded");
  assert.equal(state.reversed, true);
  assert.equal(state.entitling, false);
});

test("a reimbursed chargeback restores only credits actually removed", () => {
  const transition = calculateCreditPaymentTransition({
    ...baseCreditState,
    status: "charged_back",
    statusDetail: "reimbursed",
    refundedAmount: 20_000,
    availableCredits: 0,
    previouslyGranted: false,
    previousRefundedCredits: undefined,
    previousReversedCredits: 300,
  });

  assert.equal(transition.canonicalStatus, "reimbursed");
  assert.equal(transition.balanceDelta, 300);
  assert.equal(transition.purchasedTotalDelta, 1000);
  assert.equal(transition.reversedCredits, undefined);
  assert.equal(transition.granted, true);
});

test("a reduced partial refund restores only credits previously removed", () => {
  const transition = calculateCreditPaymentTransition({
    ...baseCreditState,
    status: "approved",
    refundedAmount: 5_000,
    availableCredits: 0,
    previouslyGranted: true,
    previousRefundedCredits: 500,
    previousReversedCredits: 400,
  });

  assert.equal(transition.canonicalStatus, "partially_refunded");
  assert.equal(transition.refundedCredits, 250);
  assert.equal(transition.balanceDelta, 250);
  assert.equal(transition.purchasedTotalDelta, 250);
  assert.equal(transition.reversedCredits, 150);
  assert.equal(transition.granted, true);
});

test("a reimbursement grants the pack when the original approval was never applied", () => {
  const transition = calculateCreditPaymentTransition({
    ...baseCreditState,
    status: "charged_back",
    statusDetail: "reimbursed",
    refundedAmount: 20_000,
    availableCredits: 0,
    previouslyGranted: false,
    previousRefundedCredits: 1000,
    previousReversedCredits: 0,
    wasEverGranted: false,
  });

  assert.equal(transition.balanceDelta, 1000);
  assert.equal(transition.markPurchased, true);
  assert.equal(transition.granted, true);
});

test("chargebacks and cancellations fully reverse payment entitlement", () => {
  for (const status of ["charged_back", "cancelled", "canceled"]) {
    const state = classifyPaymentState({
      status,
      transactionAmount: 20_000,
      refundedAmount: 0,
    });
    assert.equal(state.reversed, true);
    assert.equal(state.entitling, false);
  }
});

test("partially refunded subscription payments remain financially entitling", () => {
  const state = classifyPaymentState({
    status: "approved",
    transactionAmount: 100_000,
    refundedAmount: 25_000,
  });

  assert.equal(state.canonicalStatus, "partially_refunded");
  assert.equal(state.entitling, true);
  assert.equal(state.reversed, false);
});

test("the configured Mercado Pago trial is 14 days", () => {
  assert.equal(
    isExpectedFreeTrial(
      {
        frequency: MP_FREE_TRIAL_DAYS,
        frequency_type: "days",
      },
      MP_FREE_TRIAL_DAYS,
    ),
    true,
  );
  assert.equal(
    isExpectedFreeTrial(
      { frequency: 7, frequency_type: "days" },
      MP_FREE_TRIAL_DAYS,
    ),
    false,
  );
});

test("an authorized trial grants paid access until the first charge", () => {
  const now = Date.parse("2026-07-10T12:00:00.000Z");
  const nextPaymentDate = "2026-07-24T12:00:00.000Z";
  const trialEndsAt = initialTrialEndsAt({
    hasBillingActivity: false,
    hasPaymentState: false,
    mpStatus: "authorized",
    nextPaymentDate,
    trialDays: MP_FREE_TRIAL_DAYS,
  });

  assert.equal(trialEndsAt, Date.parse(nextPaymentDate));
  assert.equal(
    hasActivePaidEntitlement({ status: "active", trialEndsAt }, now),
    true,
  );
  assert.equal(
    hasActivePaidEntitlement(
      { status: "active", trialEndsAt },
      Date.parse(nextPaymentDate) + 1,
    ),
    false,
  );
  assert.equal(
    initialTrialEndsAt({
      existingTrialEndsAt: trialEndsAt,
      hasBillingActivity: false,
      hasPaymentState: false,
      mpStatus: "authorized",
      nextPaymentDate: "2026-07-25T12:00:00.000Z",
      trialDays: MP_FREE_TRIAL_DAYS,
    }),
    trialEndsAt,
  );
});

test("cancellation revokes trial access immediately", () => {
  const now = Date.parse("2026-07-10T12:00:00.000Z");

  assert.equal(
    hasActivePaidEntitlement(
      {
        status: "canceled",
        trialEndsAt: now + MP_FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000,
      },
      now,
    ),
    false,
  );
});

test("a consumed trial is not offered on a later checkout", () => {
  assert.equal(trialDaysForCheckout(false), MP_FREE_TRIAL_DAYS);
  assert.equal(trialDaysForCheckout(true), null);
});

test("historical trial durations validate against their persisted value", () => {
  const remoteTrial = { frequency: 14, frequency_type: "days" };

  assert.equal(getFreeTrialDays(remoteTrial), 14);
  assert.equal(isExpectedFreeTrial(remoteTrial, 14), true);
  assert.equal(isExpectedFreeTrial(remoteTrial, 7), false);
  assert.equal(isExpectedFreeTrial(null, null), true);
});

test("billing activity cannot be minted into trial entitlement", () => {
  const nextPaymentDate = "2026-08-10T12:00:00.000Z";

  assert.equal(
    initialTrialEndsAt({
      hasBillingActivity: true,
      hasPaymentState: false,
      mpStatus: "authorized",
      nextPaymentDate,
      trialDays: MP_FREE_TRIAL_DAYS,
    }),
    undefined,
  );
  assert.equal(
    initialTrialEndsAt({
      hasBillingActivity: false,
      hasPaymentState: true,
      mpStatus: "authorized",
      nextPaymentDate,
      trialDays: MP_FREE_TRIAL_DAYS,
    }),
    undefined,
  );
  assert.equal(hasRemoteBillingActivity({ charged_quantity: 1 }), true);
  assert.equal(shouldBlockTrialActivation(undefined, undefined), true);
  assert.equal(shouldBlockTrialActivation(undefined, "failed"), true);
  assert.equal(shouldBlockTrialActivation(undefined, "processed"), true);
  assert.equal(shouldBlockTrialActivation(undefined, "empty"), false);
  assert.equal(
    shouldBlockTrialActivation({ charged_quantity: 1 }, "empty"),
    true,
  );
});

test("a payment transition disables historical trial entitlement", () => {
  const now = Date.parse("2026-07-10T12:00:00.000Z");

  assert.equal(
    hasActivePaidEntitlement(
      {
        status: "active",
        trialEndsAt: now + 24 * 60 * 60 * 1000,
        paymentUpdatedAt: now,
      },
      now,
    ),
    false,
  );
});
