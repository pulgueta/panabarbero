import { Migrations } from "@convex-dev/migrations";
import { components } from "./_generated/api.js";
import type { DataModel } from "./_generated/dataModel.js";
import {
  completedAppointmentsAggregate,
  whatsappUsageAggregate,
} from "./aggregates";
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
 * Backfill the completion-time service snapshot (`completedServicePrice` +
 * `completedServiceName`) onto existing completed appointments from their
 * current service, so the operations breakdown survives a *future* service
 * deletion. Rows whose service is already gone stay unset (nothing to recover).
 * Idempotent: only writes rows still missing the snapshot. Run once with
 * `npx convex run migrations:run '{fn: "migrations:backfillCompletedServiceSnapshot"}'`.
 */
export const backfillCompletedServiceSnapshot = migrations.define({
  table: "appointments",
  migrateOne: async (ctx, appointment) => {
    if (
      appointment.status !== "completed" ||
      appointment.completedServicePrice !== undefined
    ) {
      return;
    }

    const service = await ctx.db.get(appointment.serviceId);

    if (!service) {
      return;
    }

    await ctx.db.patch(appointment._id, {
      completedServicePrice: service.price,
      completedServiceName: service.name,
    });
  },
});

/**
 * Seed the new WhatsApp usage aggregate with pre-existing `usage` rows so the
 * table trigger's `replace` finds them on the first WhatsApp increment —
 * without this, the first send for a barbershop with an existing usage row
 * throws DELETE_MISSING_KEY and fails the booking mutation. Idempotent via
 * `insertIfDoesNotExist`. Run once per deployment with
 * `npx convex run migrations:run '{fn: "migrations:backfillWhatsappUsageAggregate"}'`.
 */
export const backfillWhatsappUsageAggregate = migrations.define({
  table: "usage",
  migrateOne: async (ctx, doc) => {
    await whatsappUsageAggregate.insertIfDoesNotExist(ctx, doc);
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
