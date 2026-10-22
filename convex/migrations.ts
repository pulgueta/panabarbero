import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api.js";
import type { DataModel } from "./_generated/dataModel.js";
import {
  completedAppointmentsAggregate,
  reviewStarsAggregate,
  reviewStarsNamespace,
  whatsappUsageAggregate,
} from "./aggregates";
import { normalizeItems } from "./appointmentItems";
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
 * Backfill canonical line items onto pre-multi-service appointments. Rows that
 * already carry `items` are skipped; the rest get ONE fixed line synthesized
 * exactly like `appointmentItems.normalizeItems` — completed rows prefer the
 * completion-time snapshot, then the live service, then "Servicio" / 0 / 30.
 * Never touches the revenue aggregate. Idempotent. Run once with
 * `npx convex run migrations:run '{fn: "migrations:backfillAppointmentItems"}'`.
 */
export const backfillAppointmentItems = migrations.define({
  table: "appointments",
  migrateOne: async (ctx, appointment) => {
    if (appointment.items && appointment.items.length > 0) {
      return;
    }

    const liveService = await ctx.db.get(appointment.serviceId);

    await ctx.db.patch(appointment._id, {
      items: normalizeItems(appointment, liveService),
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

/**
 * Backfill the per-star review aggregate from existing published, unflagged
 * reviews. `reviewStarsAggregate` was added after reviews shipped, so rows
 * published before it exist only in `reviewRatingsAggregate` and the detail
 * page histogram would read zero for them. Idempotent via
 * `insertIfDoesNotExist`, so it is safe to re-run. Run once with
 * `npx convex run migrations:run '{fn: "migrations:backfillReviewStars"}'`.
 */
export const backfillReviewStars = migrations.define({
  table: "reviews",
  migrateOne: async (ctx, review) => {
    if (review.publishedAt === undefined || review.flaggedAt !== undefined) {
      return;
    }

    await reviewStarsAggregate.insertIfDoesNotExist(ctx, {
      namespace: reviewStarsNamespace(review.barbershopId, review.rating),
      key: review._creationTime,
      id: review._id,
    });
  },
});

/**
 * Seed the WhatsApp usage aggregate with pre-existing `usage` rows. The
 * runtime trigger uses `insertIfDoesNotExist`/`replaceOrInsert`, so nothing
 * throws before this runs — but per-shop sums over historical months read low
 * until it does. Idempotent via `insertIfDoesNotExist`. Run once per
 * deployment with
 * `npx convex run migrations:run '{fn: "migrations:backfillWhatsappUsageAggregate"}'`.
 */
export const backfillWhatsappUsageAggregate = migrations.define({
  table: "usage",
  migrateOne: async (ctx, doc) => {
    await whatsappUsageAggregate.insertIfDoesNotExist(ctx, doc);
  },
});

/**
 * WhatsApp-only channel cutover (plan `.plans/whatsapp-only-channel.md`, D7):
 * drop the retired email/SMS credit fields, delete non-WhatsApp purchase rows
 * and keep only the `whatsapp` preference (default ON, consent stamped when
 * missing). Typed against the tight schema, so run it BEFORE that schema is
 * validated: push once with `schemaValidation: false`, run
 * `npx convex run migrations:stripLegacyChannelData`,
 * then push with validation on. Idempotent.
 */
export const stripLegacyExtraCredits = migrations.define({
  table: "extraCredits",
  migrateOne: async (ctx, row) => {
    await ctx.db.replace(row._id, {
      barbershopId: row.barbershopId,
      whatsappCredits: row.whatsappCredits ?? 0,
      whatsappPurchasedTotal: row.whatsappPurchasedTotal ?? 0,
    });
  },
});

export const stripLegacyCreditPurchases = migrations.define({
  table: "creditPurchases",
  migrateOne: async (ctx, row) => {
    if ((row.type as string) !== "whatsapp") {
      await ctx.db.delete(row._id);
    }
  },
});

export const stripLegacyNotificationPreferences = migrations.define({
  table: "userProfileData",
  migrateOne: async (ctx, profile) => {
    const whatsapp = profile.notificationsPreferences.find(
      (p) => (p.type as string) === "whatsapp",
    );

    await ctx.db.patch(profile._id, {
      notificationsPreferences: [
        whatsapp ?? { type: "whatsapp", enabled: true },
      ],
      ...(whatsapp || profile.whatsappOptedInAt
        ? {}
        : { whatsappOptedInAt: Date.now() }),
    });
  },
});

export const stripLegacyChannelData = migrations.runner([
  internal.migrations.stripLegacyExtraCredits,
  internal.migrations.stripLegacyCreditPurchases,
  internal.migrations.stripLegacyNotificationPreferences,
]);
