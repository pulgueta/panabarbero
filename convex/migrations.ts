import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import type { DataModel } from "./_generated/dataModel.js";
import { completedAppointmentsAggregate } from "./aggregates";
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
 * Backfill revenue sums onto the completed-appointments aggregate: entries
 * inserted before the analytics feature carry sumValue 0, so `sum()` would
 * undercount estimated revenue. Re-inserts every completed appointment with
 * sumValue = current service price (best available approximation of the price
 * at completion). Idempotent via `replaceOrInsert`. Run once with
 * `npx convex run migrations:run '{fn: "migrations:backfillCompletedAppointmentRevenue"}'`.
 */
export const backfillCompletedAppointmentRevenue = migrations.define({
  table: "appointments",
  migrateOne: async (ctx, appointment) => {
    if (appointment.status !== "completed") {
      return;
    }

    const service = await ctx.db.get(appointment.serviceId);
    const item = {
      namespace: appointment.barbershopId,
      key: appointment.date,
      id: appointment._id,
    };

    await completedAppointmentsAggregate.replaceOrInsert(ctx, item, {
      ...item,
      sumValue: service?.price ?? 0,
    });
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
