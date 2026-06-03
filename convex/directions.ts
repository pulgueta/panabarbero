import { ConvexError } from "convex/values";
import { z } from "zod";

import { zAction, zInternalMutation, zQuery } from ".";
import { api, internal } from "./_generated/api";

const coord = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

type Coord = z.infer<typeof coord>;

interface RoutePayload {
  distanceMeters: number;
  durationSeconds: number;
  geometry: [number, number][];
}

type RouteResult =
  | (RoutePayload & { source: "cache" | "osrm"; elapsedMs: number })
  | null;

interface OsrmResponse {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }[];
}

/**
 * Coordinates quantized to ~4 decimal places (≈11 m). Two requests that round
 * to the same grid cell share a cache entry — "same location from both
 * parties".
 */
const COORD_PRECISION = 1e4;
const quantize = (n: number) =>
  Math.round(n * COORD_PRECISION) / COORD_PRECISION;

function routeKey(from: Coord, to: Coord): string {
  return `${quantize(from.latitude)},${quantize(from.longitude)}->${quantize(
    to.latitude,
  )},${quantize(to.longitude)}`;
}

/** Public: the cached route for a trip, or `null` if it hasn't been computed. */
export const getCachedRoute = zQuery({
  args: z.object({ from: coord, to: coord }),
  handler: async (ctx, args): Promise<RoutePayload | null> => {
    const key = routeKey(args.from, args.to);

    const cached = await ctx.db
      .query("routeCache")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (!cached) return null;

    return {
      distanceMeters: cached.distanceMeters,
      durationSeconds: cached.durationSeconds,
      geometry: cached.geometry as [number, number][],
    };
  },
});

/** Internal: upsert a computed route into the cache. */
export const cacheRoute = zInternalMutation({
  args: z.object({
    key: z.string(),
    from: coord,
    to: coord,
    distanceMeters: z.number(),
    durationSeconds: z.number(),
    geometry: z.array(z.array(z.number())),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("routeCache")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    const fields = {
      key: args.key,
      fromLatitude: args.from.latitude,
      fromLongitude: args.from.longitude,
      toLatitude: args.to.latitude,
      toLongitude: args.to.longitude,
      distanceMeters: args.distanceMeters,
      durationSeconds: args.durationSeconds,
      geometry: args.geometry,
    };

    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return;
    }

    await ctx.db.insert("routeCache", fields);
  },
});

/**
 * Driving route between two points. Serves from the Convex cache when the trip
 * (quantized) was computed before; otherwise queries the public OSRM server,
 * persists the result and returns it. Runs in an action because of the external
 * `fetch`. `source` and `elapsedMs` expose which path served the request.
 */
export const getDrivingRoute = zAction({
  args: z.object({ from: coord, to: coord }),
  handler: async (ctx, args): Promise<RouteResult> => {
    const cacheStart = Date.now();
    const cached = await ctx.runQuery(api.directions.getCachedRoute, {
      from: args.from,
      to: args.to,
    });

    if (cached) {
      return { ...cached, source: "cache", elapsedMs: Date.now() - cacheStart };
    }

    // Quantize so the stored route matches its cache key.
    const from: Coord = {
      latitude: quantize(args.from.latitude),
      longitude: quantize(args.from.longitude),
    };
    const to: Coord = {
      latitude: quantize(args.to.latitude),
      longitude: quantize(args.to.longitude),
    };

    const osrmStart = Date.now();
    const url = `https://router.project-osrm.org/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;

    let response: Response;
    try {
      response = await fetch(url);
    } catch {
      throw new ConvexError("No se pudo calcular la ruta. Intenta de nuevo.");
    }

    if (!response.ok) {
      throw new ConvexError("No se pudo calcular la ruta. Intenta de nuevo.");
    }

    const data = (await response.json()) as OsrmResponse;
    const route = data.routes?.[0];

    if (!route) {
      return null;
    }

    const payload: RoutePayload = {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      geometry: route.geometry.coordinates,
    };

    await ctx.runMutation(internal.directions.cacheRoute, {
      key: routeKey(from, to),
      from,
      to,
      distanceMeters: payload.distanceMeters,
      durationSeconds: payload.durationSeconds,
      geometry: payload.geometry,
    });

    return { ...payload, source: "osrm", elapsedMs: Date.now() - osrmStart };
  },
});
