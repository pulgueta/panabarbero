import { api } from "@convex/_generated/api";
import {
  convexQuery,
  useConvexAction,
  useConvexMutation,
} from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";

/**
 * Client hooks for the parallel MercadoPago subscription surface.
 *
 * Mirrors `use-pricing.ts` (Polar) so either provider can drive the same UI.
 * Queries are Convex-reactive, so no manual invalidation is needed after the
 * mutations/actions below — the subscription card updates on its own.
 */

export function getMpSubscriptionQueryOptions() {
  return convexQuery(api.mercadopagoSubscriptions.getMySubscription, {});
}

/** Non-suspense: gracefully returns `null` while loading / unauthenticated. */
export function useMpSubscription() {
  return useQuery(getMpSubscriptionQueryOptions());
}

/** Create a paid-plan checkout; resolves with `{ initPoint, preapprovalId }`. */
export function useCreateMpCheckout() {
  return useMutation({
    mutationFn: useConvexAction(api.mercadopago.createSubscriptionCheckout),
  });
}

/** Cancel the current user's paid MercadoPago subscription. */
export function useCancelMpSubscription() {
  return useMutation({
    mutationFn: useConvexAction(api.mercadopago.cancelSubscription),
  });
}

/** Activate the free plan (local row, no MercadoPago preapproval). */
export function useSubscribeMpFree() {
  return useMutation({
    mutationFn: useConvexMutation(api.mercadopagoSubscriptions.subscribeFree),
  });
}
