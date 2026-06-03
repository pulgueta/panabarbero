import { GeospatialIndex } from "@convex-dev/geospatial";

import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Spatial index of barbershop locations, keyed by barbershop id. Written from
 * `barbershopMetadata.setLocation` / `removeLocation` and readable from queries
 * via `get` / `nearest`.
 */
export const barbershopGeospatial = new GeospatialIndex<Id<"barbershops">>(
  components.geospatial,
);
