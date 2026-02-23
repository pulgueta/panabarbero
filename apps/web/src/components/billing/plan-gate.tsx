import type { FC, ReactNode } from "react";

import { usePlan } from "@/hooks/billing/use-plan";

/**
 * Extensible feature key type.
 *
 * Add new features here as the product evolves — the compiler will flag any
 * call-site that references a key that no longer exists.
 */
export type GatedFeature = "inviteBarbers" | "staffAppointments";

function isFeatureAllowed(
  feature: GatedFeature,
  plan: ReturnType<typeof usePlan>,
): boolean {
  switch (feature) {
    case "inviteBarbers":
      return plan.canInviteBarbers;
    case "staffAppointments":
      return plan.canCreateStaffAppointments;
    default: {
      // Exhaustive check — TS will error if a new feature is added but not handled
      const _exhaustive: never = feature;
      return _exhaustive;
    }
  }
}

interface PlanGateProps {
  /** Which feature to gate. */
  feature: GatedFeature;
  /**
   * What to render when the user's plan does not include the feature.
   * Defaults to rendering nothing (`null`).
   */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Declarative plan-based gate for UI elements.
 *
 * Renders `children` only when the current user's subscription tier includes
 * the requested feature. Otherwise renders `fallback` (defaults to `null`).
 *
 * **This is a UX convenience only** — the server enforces limits authoritatively
 * via the helpers in `convex/acl.ts`.
 *
 * @example
 * ```tsx
 * <PlanGate feature="inviteBarbers" fallback={<UpgradeButton />}>
 *   <InviteBarberDialog />
 * </PlanGate>
 * ```
 */

export const PlanGate: FC<PlanGateProps> = ({
  feature,
  fallback = null,
  children,
}) => {
  const plan = usePlan();

  // While loading, render nothing to avoid flicker
  if (plan.isLoading) {
    return null;
  }

  return isFeatureAllowed(feature, plan) ? children : fallback;
};
