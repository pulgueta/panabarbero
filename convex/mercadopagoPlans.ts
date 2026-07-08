/**
 * MercadoPago subscription plan catalog — pure TypeScript, no Convex runtime
 * dependencies, so it can be imported from both server functions and the client.
 *
 * This is the MercadoPago counterpart to the Polar product configuration. Tier
 * derivation still flows through `convex/plans.ts` (`productKey` → tier), so a
 * MercadoPago subscription and a Polar subscription that share a `productKey`
 * resolve to the exact same plan limits. That is what makes MercadoPago a
 * drop-in replacement for Polar without changing any gating logic.
 *
 * Amounts mirror the Polar COP prices (Polar stores COP in minor units / ×100;
 * MercadoPago charges COP as whole pesos, so the values below are the displayed
 * peso amounts). The free tier (`independiente`) has no MercadoPago subscription
 * — it is represented by a local row only, since MercadoPago cannot create a
 * $0 recurring charge.
 */

import type { PlanTier, ProductKey } from "./plans";
import { PRODUCT_KEY_TO_TIER } from "./plans";

/** MercadoPago billing frequency for a plan. All plans bill in months. */
export interface MpPlanConfig {
  /** Stable product key — shared vocabulary with `convex/plans.ts`. */
  productKey: ProductKey;
  /** Resolved plan tier (drives limits via `getLimitsForProductKey`). */
  tier: PlanTier;
  /** Human-facing interval label. */
  interval: "month" | "year";
  /** `auto_recurring.frequency` (number of `frequency_type` units per charge). */
  frequency: number;
  /** `auto_recurring.frequency_type`. MercadoPago accepts `months` or `days`. */
  frequencyType: "months" | "days";
  /** Amount charged per billing cycle, in whole COP pesos. */
  amountCop: number;
  /** `reason` shown to the buyer on the MercadoPago checkout. */
  reason: string;
}

/** ISO 4217 currency for every MercadoPago subscription in this app. */
export const MP_CURRENCY_ID = "COP";

/**
 * Paid plans only. `independiente` (free) is intentionally excluded — it never
 * creates a MercadoPago preapproval.
 */
export const MP_PAID_PRODUCT_KEYS = [
  "barberiaMonthly",
  "barberiaYearly",
  "barberiaProfMonthly",
  "barberiaProfYearly",
] as const satisfies readonly ProductKey[];

export type MpPaidProductKey = (typeof MP_PAID_PRODUCT_KEYS)[number];

/** The free product key, handled entirely with a local subscription row. */
export const MP_FREE_PRODUCT_KEY = "independiente" satisfies ProductKey;

const MP_PLANS: Record<MpPaidProductKey, MpPlanConfig> = {
  barberiaMonthly: {
    productKey: "barberiaMonthly",
    tier: PRODUCT_KEY_TO_TIER.barberiaMonthly,
    interval: "month",
    frequency: 1,
    frequencyType: "months",
    amountCop: 90000,
    reason: "PanaBarbero — Plan Barbería (mensual)",
  },
  barberiaYearly: {
    productKey: "barberiaYearly",
    tier: PRODUCT_KEY_TO_TIER.barberiaYearly,
    interval: "year",
    frequency: 12,
    frequencyType: "months",
    amountCop: 900000,
    reason: "PanaBarbero — Plan Barbería (anual)",
  },
  barberiaProfMonthly: {
    productKey: "barberiaProfMonthly",
    tier: PRODUCT_KEY_TO_TIER.barberiaProfMonthly,
    interval: "month",
    frequency: 1,
    frequencyType: "months",
    amountCop: 185000,
    reason: "PanaBarbero — Plan Barbería Profesional (mensual)",
  },
  barberiaProfYearly: {
    productKey: "barberiaProfYearly",
    tier: PRODUCT_KEY_TO_TIER.barberiaProfYearly,
    interval: "year",
    frequency: 12,
    frequencyType: "months",
    amountCop: 1800000,
    reason: "PanaBarbero — Plan Barbería Profesional (anual)",
  },
};

/** Type guard: is this productKey a paid MercadoPago plan? */
export function isMpPaidProductKey(
  key: string | undefined | null,
): key is MpPaidProductKey {
  return !!key && (MP_PAID_PRODUCT_KEYS as readonly string[]).includes(key);
}

/** Get the MercadoPago plan config for a paid product key. */
export function getMpPlan(key: MpPaidProductKey): MpPlanConfig {
  return MP_PLANS[key];
}

/** Ordered list of paid plan configs (for rendering pricing cards). */
export const MP_PAID_PLANS: MpPlanConfig[] = MP_PAID_PRODUCT_KEYS.map(
  (key) => MP_PLANS[key],
);

/**
 * App-normalized subscription status. Deliberately matches the vocabulary the
 * ACL layer already expects from Polar (`active` / `trialing` gate access), so
 * `getCurrentMpSubscription` is a shape-for-shape substitute for
 * `polar.getCurrentSubscription`.
 */
export type MpSubscriptionStatus =
  | "active"
  | "pending"
  | "paused"
  | "canceled"
  | "trialing";

/**
 * Map a raw MercadoPago preapproval status to the app-normalized status.
 * MercadoPago statuses: `authorized`, `pending`, `paused`, `cancelled`.
 */
export function normalizeMpStatus(
  mpStatus: string | undefined | null,
): MpSubscriptionStatus {
  switch (mpStatus) {
    case "authorized":
      return "active";
    case "paused":
      return "paused";
    case "cancelled":
    case "canceled":
      return "canceled";
    default:
      return "pending";
  }
}
