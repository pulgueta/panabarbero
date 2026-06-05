import { convexQuery, useConvexAction } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useMutation } from "@tanstack/react-query";

export interface Coord {
  latitude: number;
  longitude: number;
}

export function getCachedRouteQueryOptions(from: Coord, to: Coord) {
  return convexQuery(api.directions.getCachedRoute, { from, to });
}

/**
 * Imperative driving-route lookup (OSRM via a Convex action that also caches
 * the result). Returns a react-query mutation so callers can
 * `mutateAsync({ from, to })` on demand.
 */
export function useDrivingRoute() {
  return useMutation({
    mutationFn: useConvexAction(api.directions.getDrivingRoute),
  });
}
