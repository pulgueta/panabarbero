/**
 * MercadoPago subscription plan catalog — pure TypeScript, no Convex runtime
 * dependencies, so it can be imported from both server functions and the client.
 *
 * Tier derivation still flows through `convex/plans.ts` (`productKey` → tier).
 * MercadoPago charges COP as whole pesos, so catalog amounts below are the
 * displayed and charged values. The free tier (`independiente`) is a local
 * entitlement because MercadoPago cannot create a $0 recurring charge.
 */

import type { CreditProductKey, PlanTier, ProductKey } from "./plans";
import {
  CREDIT_KEY_TO_TYPE,
  CREDIT_PRODUCT_KEYS,
  CREDITS_PER_PURCHASE,
  PRODUCT_KEY_TO_TIER,
} from "./plans";

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

const MP_PLANS: { [K in MpPaidProductKey]: MpPlanConfig & { productKey: K } } =
  {
    barberiaMonthly: {
      productKey: "barberiaMonthly",
      tier: PRODUCT_KEY_TO_TIER.barberiaMonthly,
      interval: "month",
      frequency: 1,
      frequencyType: "months",
      amountCop: 100_000,
      reason: "PanaBarbero — Plan Barbería (mensual)",
    },
    barberiaYearly: {
      productKey: "barberiaYearly",
      tier: PRODUCT_KEY_TO_TIER.barberiaYearly,
      interval: "year",
      frequency: 12,
      frequencyType: "months",
      amountCop: 1_000_000,
      reason: "PanaBarbero — Plan Barbería (anual)",
    },
    barberiaProfMonthly: {
      productKey: "barberiaProfMonthly",
      tier: PRODUCT_KEY_TO_TIER.barberiaProfMonthly,
      interval: "month",
      frequency: 1,
      frequencyType: "months",
      amountCop: 200_000,
      reason: "PanaBarbero — Plan Barbería Profesional (mensual)",
    },
    barberiaProfYearly: {
      productKey: "barberiaProfYearly",
      tier: PRODUCT_KEY_TO_TIER.barberiaProfYearly,
      interval: "year",
      frequency: 12,
      frequencyType: "months",
      amountCop: 2_000_000,
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

/**
 * Ordered list of paid plan configs (for rendering pricing cards). The element
 * type keeps `productKey` narrowed to `MpPaidProductKey` (not the wider
 * `ProductKey`) so consumers can pass it straight to paid-only APIs.
 */
export const MP_PAID_PLANS = MP_PAID_PRODUCT_KEYS.map((key) => MP_PLANS[key]);

/**
 * One-time SMS/email credit packs sold through MercadoPago Checkout Pro (a
 * hosted Preference). Amounts are server-owned — the checkout action reads the
 * price from here, never from the client — and `credits` mirrors
 * `CREDITS_PER_PURCHASE` so a pack always grants exactly what it advertises.
 */
export interface MpCreditPack {
  productKey: CreditProductKey;
  type: "sms" | "email";
  credits: number;
  amountCop: number;
  title: string;
  description: string;
}

export const MP_CREDIT_PACKS: Record<CreditProductKey, MpCreditPack> = {
  extraSms: {
    productKey: "extraSms",
    type: CREDIT_KEY_TO_TYPE.extraSms,
    credits: CREDITS_PER_PURCHASE.extraSms,
    amountCop: 20_000,
    title: `${CREDITS_PER_PURCHASE.extraSms} SMS Extra`,
    description:
      "Adquiere SMS extra para poder notificar a tus clientes por este canal.",
  },
  extraEmails: {
    productKey: "extraEmails",
    type: CREDIT_KEY_TO_TYPE.extraEmails,
    credits: CREDITS_PER_PURCHASE.extraEmails,
    amountCop: 10_000,
    title: `${CREDITS_PER_PURCHASE.extraEmails} Correos Extra`,
    description:
      "Adquiere correos extra para poder notificar a tus clientes por este canal.",
  },
};

/** Ordered list of credit packs, for rendering the extra-usage cards. */
export const MP_CREDIT_PACK_LIST: MpCreditPack[] = CREDIT_PRODUCT_KEYS.map(
  (key) => MP_CREDIT_PACKS[key],
);

/** Type guard: is this string a one-time credit product key? */
export function isCreditProductKey(
  key: string | undefined | null,
): key is CreditProductKey {
  return !!key && (CREDIT_PRODUCT_KEYS as readonly string[]).includes(key);
}

/** App-normalized MercadoPago agreement status. */
export type MpSubscriptionStatus = "active" | "pending" | "paused" | "canceled";

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
