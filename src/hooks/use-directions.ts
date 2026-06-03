import { api } from "@convex/_generated/api";
import { convexQuery, useConvexAction } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
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

export interface DirectionsBenchmark {
  /** Round-trip to read the route from the Convex cache (ms). */
  convexMs: number;
  /** Round-trip to fetch the route straight from the OSRM API (ms). */
  apiMs: number;
  faster: "convex" | "api";
}

/**
 * Head-to-head latency of the two ways to obtain the same route: the Convex
 * cache vs. a direct call to the routing API. Only meaningful once the route is
 * cached. Intended for development diagnostics.
 */
export async function benchmarkDirections(
  queryClient: QueryClient,
  from: Coord,
  to: Coord,
): Promise<DirectionsBenchmark> {
  const convexStart = performance.now();
  await queryClient.fetchQuery(getCachedRouteQueryOptions(from, to));
  const convexMs = performance.now() - convexStart;

  const apiStart = performance.now();
  await fetch(
    `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`,
  );
  const apiMs = performance.now() - apiStart;

  return { convexMs, apiMs, faster: convexMs <= apiMs ? "convex" : "api" };
}
