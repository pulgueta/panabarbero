import { api } from "@convex/_generated/api";
import { convexQuery, useConvexAction } from "@convex-dev/react-query";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";

/**
 * Client hooks for MercadoPago billing. Queries are Convex-reactive, so the
 * subscription card updates without manual invalidation.
 */

export function getMpSubscriptionQueryOptions() {
  return convexQuery(api.mercadopagoSubscriptions.getMySubscription, {});
}

export function useMpSubscription() {
  return useSuspenseQuery(getMpSubscriptionQueryOptions());
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

/** Reconcile the current paid agreement against Mercado Pago invoices. */
export function useReconcileMpSubscription() {
  return useMutation({
    mutationFn: useConvexAction(api.mercadopago.reconcileSubscription),
  });
}

/** Activate the free plan (local row, no MercadoPago preapproval). */
export function useSubscribeMpFree() {
  return useMutation({
    mutationFn: useConvexAction(api.mercadopago.subscribeFree),
  });
}

/**
 * Create a hosted MercadoPago Checkout Pro session for a one-time SMS/email
 * credit pack; resolves with `{ initPoint, preferenceId }`.
 */
export function useCreateMpCreditCheckout() {
  return useMutation({
    mutationFn: useConvexAction(api.mercadopago.createCreditCheckout),
  });
}
