import type { PolarProduct } from "./polarProducts";

export interface PlanConfig {
  maxOrganizationsPerUser: number;
  maxBarbershopsPerOrganization: number;
  maxMembersPerOrganization: number;
  maxServicesPerBarbershop: number;
  features: {
    analytics: boolean;
    customDomain: boolean;
    prioritySupport: boolean;
    smsNotifications: boolean;
    emailBranding: boolean;
  };
}

export type PlanType = "free" | "starter" | "professional" | "enterprise";

/**
 * Plan limits configuration
 * Maps plan types to their resource limits and features
 */
export const PLAN_LIMITS: Record<PlanType, PlanConfig> = {
  free: {
    maxOrganizationsPerUser: 1,
    maxBarbershopsPerOrganization: 1,
    maxMembersPerOrganization: 2, // owner + 1 barber
    maxServicesPerBarbershop: 5,
    features: {
      analytics: false,
      customDomain: false,
      prioritySupport: false,
      smsNotifications: false,
      emailBranding: false,
    },
  },
  starter: {
    maxOrganizationsPerUser: 1,
    maxBarbershopsPerOrganization: 3,
    maxMembersPerOrganization: 5,
    maxServicesPerBarbershop: 20,
    features: {
      analytics: true,
      customDomain: false,
      prioritySupport: false,
      smsNotifications: true,
      emailBranding: false,
    },
  },
  professional: {
    maxOrganizationsPerUser: 3,
    maxBarbershopsPerOrganization: 10,
    maxMembersPerOrganization: 20,
    maxServicesPerBarbershop: 100,
    features: {
      analytics: true,
      customDomain: true,
      prioritySupport: true,
      smsNotifications: true,
      emailBranding: true,
    },
  },
  enterprise: {
    maxOrganizationsPerUser: 10,
    maxBarbershopsPerOrganization: 50,
    maxMembersPerOrganization: 100,
    maxServicesPerBarbershop: 500,
    features: {
      analytics: true,
      customDomain: true,
      prioritySupport: true,
      smsNotifications: true,
      emailBranding: true,
    },
  },
};

/**
 * Extracts the plan type from a product slug
 * E.g., "professional-monthly" -> "professional"
 */
export const getPlanTypeFromSlug = (slug: string): PlanType => {
  const planTypes: PlanType[] = ["enterprise", "professional", "starter"];

  for (const planType of planTypes) {
    if (slug.toLowerCase().includes(planType)) {
      return planType;
    }
  }

  return "free";
};

/**
 * Gets the plan configuration for a specific product
 */
export const getPlanLimitsFromProduct = (product: PolarProduct): PlanConfig => {
  const planType = getPlanTypeFromSlug(product.slug);
  return PLAN_LIMITS[planType];
};

/**
 * Gets the plan configuration for a product ID
 * Falls back to free plan if product not found
 */
export const getPlanLimitsFromProductId = async (
  productId: string,
  products: PolarProduct[],
): Promise<PlanConfig> => {
  const product = products.find((p) => p.productId === productId);

  if (!product) {
    return PLAN_LIMITS.free;
  }

  return getPlanLimitsFromProduct(product);
};

/**
 * Gets the default free plan limits
 */
export const getFreePlanLimits = (): PlanConfig => PLAN_LIMITS.free;
