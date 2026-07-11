/** Pure Mercado Pago subscription-trial and entitlement helpers. */

export const MP_FREE_TRIAL_DAYS = 14;

export function getFreeTrialDays(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const trial = value as Record<string, unknown>;
  return trial.frequency_type === "days" && typeof trial.frequency === "number"
    ? trial.frequency
    : undefined;
}

export function isExpectedFreeTrial(
  value: unknown,
  expectedDays: number | null,
) {
  const actualDays = getFreeTrialDays(value);
  return expectedDays === null ? value == null : actualDays === expectedDays;
}

export function trialDaysForCheckout(hasConsumedTrial: boolean) {
  return hasConsumedTrial ? null : MP_FREE_TRIAL_DAYS;
}

export function hasRemoteBillingActivity(
  value:
    | {
        charged_quantity?: number | null;
        last_charged_date?: string | null;
      }
    | null
    | undefined,
) {
  return (value?.charged_quantity ?? 0) > 0 || value?.last_charged_date != null;
}

export function shouldBlockTrialActivation(
  summary: Parameters<typeof hasRemoteBillingActivity>[0],
  invoiceReconciliation: "empty" | "failed" | "processed" | undefined,
) {
  return hasRemoteBillingActivity(summary) || invoiceReconciliation !== "empty";
}

export function initialTrialEndsAt({
  existingTrialEndsAt,
  hasBillingActivity,
  hasPaymentState,
  mpStatus,
  nextPaymentDate,
  trialDays,
}: {
  existingTrialEndsAt?: number;
  hasBillingActivity: boolean;
  hasPaymentState: boolean;
  mpStatus: string;
  nextPaymentDate?: string;
  trialDays?: number;
}) {
  if (
    existingTrialEndsAt !== undefined ||
    hasBillingActivity ||
    hasPaymentState ||
    mpStatus !== "authorized" ||
    trialDays === undefined ||
    nextPaymentDate === undefined
  ) {
    return existingTrialEndsAt;
  }

  const parsed = Date.parse(nextPaymentDate);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function hasActivePaidEntitlement(
  row: {
    lastPaymentId?: string;
    paymentUpdatedAt?: number;
    status: string;
    paidThrough?: number;
    trialEndsAt?: number;
  },
  now: number,
) {
  return (
    row.status === "active" &&
    ((row.paidThrough ?? 0) > now ||
      (row.lastPaymentId === undefined &&
        row.paymentUpdatedAt === undefined &&
        (row.trialEndsAt ?? 0) > now))
  );
}
