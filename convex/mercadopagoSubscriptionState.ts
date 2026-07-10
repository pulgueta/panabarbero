/** Pure Mercado Pago subscription-trial and entitlement helpers. */

export const MP_FREE_TRIAL_DAYS = 14;

export function isExpectedFreeTrial(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const trial = value as Record<string, unknown>;
  return (
    trial.frequency === MP_FREE_TRIAL_DAYS && trial.frequency_type === "days"
  );
}

export function initialTrialEndsAt({
  existingTrialEndsAt,
  mpStatus,
  nextPaymentDate,
  trialDays,
}: {
  existingTrialEndsAt?: number;
  mpStatus: string;
  nextPaymentDate?: string;
  trialDays?: number;
}) {
  if (
    existingTrialEndsAt !== undefined ||
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
    status: string;
    paidThrough?: number;
    trialEndsAt?: number;
  },
  now: number,
) {
  return (
    row.status === "active" &&
    ((row.paidThrough ?? 0) > now || (row.trialEndsAt ?? 0) > now)
  );
}
