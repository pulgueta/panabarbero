import { api } from "@convex/_generated/api";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Query options (reusable in route loaders / prefetching)
// ---------------------------------------------------------------------------

export function getPanaAccessQueryOptions() {
  return convexQuery(api.aiChat.getPanaAccess, {});
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Whether the current user may use Pana's barbershop-management capabilities.
 *
 * Customers (authenticated or anonymous) are never gated — `isShopMember` is
 * `false` and `canManage` is `true`. For shop members, `canManage` reflects the
 * **barbershop owner's** plan. Uses `useQuery` (not suspense) so it handles the
 * unauthenticated state without throwing.
 */
export function usePanaAccess() {
  return useQuery(getPanaAccessQueryOptions());
}
