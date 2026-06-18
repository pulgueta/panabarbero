import { R2 } from "@convex-dev/r2";
import { z } from "zod";

import { zAuthAction, zMutation } from ".";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { requireUserId } from "./identity";
import { rateLimitOrThrow } from "./ratelimit";

export const r2 = new R2(components.r2);

export const {
  generateUploadUrl,
  listMetadata,
  deleteObject,
  getMetadata,
  syncMetadata,
  onSyncMetadata,
} = r2.clientApi<DataModel>({
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

    return await r2.deleteObject(ctx, args.key);
  },
});

export const uploadR2Object = zMutation({
  args: z.object({
    key: z.string(),
  }),
  handler: async (ctx, args) => {
    await rateLimitOrThrow(ctx, "uploadBarbershopLogo", args.key);

    return await r2.generateUploadUrl(args.key);
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
  handler: async (ctx, args) => {
    return await r2.store(ctx, args.file, {
      key: args.key,
    });
  },
});
