import { GeospatialIndex } from "@convex-dev/geospatial";
import { components } from "./_generated/api";
import { mutation } from "./_generated/server";

export const geospatial = new GeospatialIndex(components.geospatial);

export { getCurrentUser } from "./auth";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
