import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import type { DataModel } from "./_generated/dataModel.js";
import { authz, barbershopScope } from "./authz";

export const migrations = new Migrations<DataModel>(components.migrations);
export const run = migrations.runner();

/**
 * Backfill the authz component's role assignments from active
 * `barbershopMembers` rows. Idempotent (re-assigning an existing role/scope
 * extends it instead of duplicating), so it is safe to re-run. Run once per
 * deployment with
 * `npx convex run migrations:run '{fn: "migrations:backfillAuthzRoleAssignments"}'`.
 */
export const backfillAuthzRoleAssignments = migrations.define({
  table: "barbershopMembers",
  migrateOne: async (ctx, member) => {
    if (!member.isActive) {
      return;
    }

    const profile = await ctx.db.get(member.userProfileDataId);

    if (!profile?.userId) {
      return;
    }

    for (const role of member.roles) {
      await authz.assignRole(
        ctx,
        profile.userId,
        role,
        barbershopScope(member.barbershopId),
      );
    }
  },
});

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
