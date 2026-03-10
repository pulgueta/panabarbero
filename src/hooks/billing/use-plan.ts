import { convexQuery } from "@convex-dev/react-query";
import type { PlanLimits, PlanTier } from "@convex/plans";
import { PLAN_LIMITS } from "@convex/plans";
import type { Barbershop } from "@convex/schema";
import { useQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";

// ---------------------------------------------------------------------------
// Query options (reusable in route loaders / prefetching)
// ---------------------------------------------------------------------------

export function getPlanQueryOptions() {
  return convexQuery(api.auth.getUserSubscription, {});
}

export function getBarbershopPlanQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexQuery(api.auth.getBarbershopOwnerSubscription, {
    id: barbershopId,
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UsePlanResult {
  /** The resolved plan tier. Defaults to `"free"` when loading or unauthenticated. */
  planTier: PlanTier;
  /** Numeric / boolean limits for the current tier. */
  planLimits: PlanLimits;
  /** Whether the user has an active subscription (including free). */
  isSubscribed: boolean;
  /** Whether the query is still loading. */
  isLoading: boolean;

  // Convenience feature flags ---
  canInviteBarbers: boolean;
  canCreateStaffAppointments: boolean;
  maxInvitedBarbers: number | null;
  maxSmsPerMonth: number | null;
  isFree: boolean;
  isPro: boolean;
  isPremium: boolean;
}

/**
 * Primary client-side hook for plan-aware UI.
 *
 * Wraps `getUserSubscription` and derives typed feature flags from
 * `convex/plans.ts` — the same source of truth used on the server.
 *
 * Uses `useQuery` (not `useSuspenseQuery`) so it gracefully handles the
 * unauthenticated state without throwing.
 */
export function usePlan(): UsePlanResult {
  const { data: subscription, isLoading } = useQuery(getPlanQueryOptions());

  const planTier: PlanTier = subscription?.planTier ?? "free";
  const planLimits: PlanLimits = subscription?.planLimits ?? PLAN_LIMITS.free;
  const isSubscribed =
    subscription?.isSubscribed ||
    subscription?.status === "active" ||
    subscription?.status === "trialing";

  return {
    planTier,
    planLimits,
    isSubscribed,
    isLoading,

    // Feature flags
    canInviteBarbers:
      planLimits.maxInvitedBarbers !== null && planLimits.maxInvitedBarbers > 0,
    canCreateStaffAppointments: planLimits.staffCanCreateAppointments,
    maxInvitedBarbers: planLimits.maxInvitedBarbers,
    maxSmsPerMonth: planLimits.maxSmsPerMonth,

    // Tier booleans
    isFree: planTier === "free",
    isPro: planTier === "pro",
    isPremium: planTier === "premium",
  };
}

/**
 * Returns plan info for a barbershop based on the **owner's** subscription.
 * Use this instead of `usePlan` when the current user is a staff member
 * and you need to check what the barbershop's plan allows.
 */
export function useBarbershopPlan(
  barbershopId: Barbershop["_id"],
): UsePlanResult {
  const { data: subscription, isLoading } = useQuery(
    getBarbershopPlanQueryOptions(barbershopId),
  );

  const planTier: PlanTier = subscription?.planTier ?? "free";
  const planLimits: PlanLimits = subscription?.planLimits ?? PLAN_LIMITS.free;
  const isSubscribed =
    subscription?.isSubscribed ||
    subscription?.status === "active" ||
    subscription?.status === "trialing";

  return {
    planTier,
    planLimits,
    isSubscribed,
    isLoading,

    canInviteBarbers:
      planLimits.maxInvitedBarbers !== null && planLimits.maxInvitedBarbers > 0,
    canCreateStaffAppointments: planLimits.staffCanCreateAppointments,
    maxInvitedBarbers: planLimits.maxInvitedBarbers,
    maxSmsPerMonth: planLimits.maxSmsPerMonth,

    isFree: planTier === "free",
    isPro: planTier === "pro",
    isPremium: planTier === "premium",
  };
}
