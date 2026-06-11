import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import type { DataModel } from "./_generated/dataModel.js";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

/**
 * One-off (dev data): wipe inbox rows carrying the legacy `readAt` field so
 * the table validates against the watermark-based schema. Run once with
 * `npx convex run migrations:run '{fn: "migrations:wipeInAppNotifications"}'`.
 */
export const wipeInAppNotifications = migrations.define({
  table: "inAppNotifications",
  migrateOne: async (ctx, doc) => {
    await ctx.db.delete(doc._id);
  },
});
