import { GeospatialIndex } from "@convex-dev/geospatial";
import { R2 } from "@convex-dev/r2";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import { rateLimitOrThrow } from "./ratelimit";

export const geospatial = new GeospatialIndex(components.geospatial);
export const r2 = new R2(components.r2);

export const { generateUploadUrl, listMetadata, deleteObject, getMetadata } =
  r2.clientApi();

export const deleteR2Object = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await rateLimitOrThrow(ctx, "deleteR2Object", args.key);
    return await r2.deleteObject(ctx, args.key);
  },
});
