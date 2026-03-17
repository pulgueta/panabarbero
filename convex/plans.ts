/**
 * Plan limits and tier configuration — single source of truth.
 *
 * This module is pure TypeScript with no Convex runtime dependencies so it can
 * be imported from both Convex server functions and client-side code.
 *
 * Tier derivation is based on `subscription.productKey` (a stable string
 * configured in the Polar constructor), NOT on product IDs or price amounts.
 */

export const PLAN_PRODUCT_KEYS = [
  "independiente",
  "barberiaMonthly",
  "barberiaYearly",
  "barberiaProfMonthly",
  "barberiaProfYearly",
] as const;

export type ProductKey = (typeof PLAN_PRODUCT_KEYS)[number];

export type PlanTier = "free" | "pro" | "premium";

export const PRODUCT_KEY_TO_TIER: Record<ProductKey, PlanTier> = {
  independiente: "free",
  barberiaMonthly: "pro",
  barberiaYearly: "pro",
  barberiaProfMonthly: "premium",
  barberiaProfYearly: "premium",
};

export interface PlanLimits {
  /** Max invited barbers (excluding owner). `null` means unlimited. */
  maxInvitedBarbers: number | null;
  /** Max SMS the barbershop can send per calendar month. `null` means unlimited. */
  maxSmsPerMonth: number | null;
  /** Max emails the barbershop can send per calendar month. `null` means unlimited. */
  maxEmailPerMonth: number | null;
  /** Max invited staff/receptionists. `null` means unlimited. */
  maxStaff: number | null;
  /** Whether staff (owner/barber) can create appointments on behalf of clients. */
  staffCanCreateAppointments: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxInvitedBarbers: 0,
    maxStaff: 0,
    maxSmsPerMonth: 200,
    maxEmailPerMonth: 50,
    staffCanCreateAppointments: false,
  },
  pro: {
    maxInvitedBarbers: 5,
    maxStaff: 1,
    maxSmsPerMonth: 1000,
    maxEmailPerMonth: 500,
    staffCanCreateAppointments: true,
  },
  premium: {
    maxInvitedBarbers: 10,
    maxStaff: 3,
    maxSmsPerMonth: 3000,
    maxEmailPerMonth: 1500,
    staffCanCreateAppointments: true,
  },
};

/** Derive the plan tier from a product key string. Falls back to `"free"`. */
export function getTierForProductKey(key: string | undefined | null): PlanTier {
  if (key && key in PRODUCT_KEY_TO_TIER) {
    return PRODUCT_KEY_TO_TIER[key as ProductKey];
  }
  return "free";
}

/** Get the plan limits for a given product key. Falls back to free-tier limits. */
export function getLimitsForProductKey(
  key: string | undefined | null,
): PlanLimits {
  return PLAN_LIMITS[getTierForProductKey(key)];
}

/** Get the current `YYYY-MM` string (UTC). */
export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
