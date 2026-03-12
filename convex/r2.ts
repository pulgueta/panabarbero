import { R2 } from "@convex-dev/r2";
import { z } from "zod";

import { zMutation } from ".";
import { components } from "./_generated/api";
import { rateLimitOrThrow } from "./ratelimit";

export const r2 = new R2(components.r2);

export const {
  generateUploadUrl,
  listMetadata,
  deleteObject,
  getMetadata,
  syncMetadata,
  onSyncMetadata,
} = r2.clientApi();

export const deleteR2Object = zMutation({
  args: z.object({
    key: z.string(),
  }),
  handler: async (ctx, args) => {
    await rateLimitOrThrow(ctx, "deleteR2Object", args.key);

    return await r2.deleteObject(ctx, args.key);
  },
});
