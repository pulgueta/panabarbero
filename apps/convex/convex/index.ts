import { GeospatialIndex } from "@convex-dev/geospatial";
import { components } from "./_generated/api";

export const geospatial = new GeospatialIndex(components.geospatial);

export { getCurrentUser } from "./auth";
