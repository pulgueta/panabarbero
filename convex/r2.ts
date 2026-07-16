import { R2 } from "@convex-dev/r2";
import { ConvexError } from "convex/values";
import { z } from "zod";

import { zAuthAction, zInternalMutation, zMutation } from ".";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { errorMessages } from "./errors";
import { requireUserId } from "./identity";
import { rateLimitOrThrow } from "./ratelimit";

export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata, onSyncMetadata } =
  r2.clientApi<DataModel>({
    checkUpload: async (ctx) => {
      await requireUserId(ctx);
    },
  });

export const deleteR2Object = zMutation({
  args: z.object({
    key: z.string(),
  }),
  handler: async (ctx, args) => {
    await rateLimitOrThrow(ctx, "deleteR2Object", args.key);

    const linkedSale = await ctx.db
      .query("inventorySales")
      .withIndex("by_proofKey", (q) => q.eq("proofKey", args.key))
      .first();

    if (linkedSale) {
      throw new ConvexError(errorMessages.invalidSaleProof);
    }

    return await r2.deleteObject(ctx, args.key);
  },
});

export const deleteR2ObjectForCascade = zInternalMutation({
  args: z.object({
    key: z.string(),
  }),
  handler: async (ctx, args) => {
    return await r2.deleteObject(ctx, args.key);
  },
});

/**
 * z.file() is not supported in convex, must be a file.
 */
export const upload = zAuthAction({
  args: z.object({
    file: z.instanceof(Blob),
    key: z.string(),
  }),
  ratelimit: "r2",
  handler: async (ctx, args) => {
    return await r2.store(ctx, args.file, {
      key: args.key,
    });
  },
});
