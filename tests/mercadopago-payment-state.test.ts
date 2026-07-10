import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateCreditPaymentTransition,
  classifyPaymentState,
} from "../convex/mercadopagoPaymentState.ts";

const baseCreditState = {
  credits: 1000,
  transactionAmount: 20_000,
  availableCredits: 1000,
  previouslyGranted: true,
  previousRefundedCredits: 0,
  previousReversedCredits: 0,
  wasEverGranted: true,
};

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
