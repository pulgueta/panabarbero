/**
 * Aggregate definitions — efficient O(log n) counts and sums.
 *
 * Three aggregates are registered:
 *   - completedAppointmentsAggregate: count completed appointments per barbershop
 *   - smsUsageAggregate: sum smsSent per barbershop (across months)
 *   - emailUsageAggregate: sum emailsSent per barbershop (across months)
 *
 * `smsUsageAggregate` and `emailUsageAggregate` are kept in sync automatically
 * via a Trigger registered on the `usage` table — no manual `.insert/.replace`
 * calls are needed in mutations.
 * `completedAppointmentsAggregate` is a DirectAggregate and must still be
 * maintained manually.
 */

import { DirectAggregate, TableAggregate } from "@convex-dev/aggregate";
import { Triggers } from "convex-helpers/server/triggers";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import type { Appointment, Barbershop, Review } from "./schema";

/**
 * Counts completed appointments per barbershop.
 *
 * Namespace: barbershopId
 * Key:       appointment date (timestamp) — enables range queries by time
 * Id:        appointmentId (unique tie-breaker)
 */
export const completedAppointmentsAggregate = new DirectAggregate<{
  Namespace: Barbershop["_id"];
  Key: number;
  Id: Appointment["_id"];
}>(components.aggregateCompletedAppointments);

/**
 * Sums smsSent across all `usage` rows per barbershop.
 *
 * Namespace: barbershopId
 * Key:       month string (YYYY-MM) — enables range queries per month
 * sumValue:  smsSent
 */
export const smsUsageAggregate = new TableAggregate<{
  Namespace: Barbershop["_id"];
  Key: string;
  DataModel: DataModel;
  TableName: "usage";
}>(components.aggregateSmsSent, {
  namespace: (doc) => doc.barbershopId,
  sortKey: (doc) => doc.month,
  sumValue: (doc) => doc.smsSent,
});

/**
 * Sums emailsSent across all `usage` rows per barbershop.
 *
 * Namespace: barbershopId
 * Key:       month string (YYYY-MM) — enables range queries per month
 * sumValue:  emailsSent
 */
export const emailUsageAggregate = new TableAggregate<{
  Namespace: Barbershop["_id"];
  Key: string;
  DataModel: DataModel;
  TableName: "usage";
}>(components.aggregateEmailsSent, {
  namespace: (doc) => doc.barbershopId,
  sortKey: (doc) => doc.month,
  sumValue: (doc) => doc.emailsSent,
});

/**
 * Sums review ratings per barbershop so the average (sum / count) and the
 * published-review count are read in O(log n) for the card + detail page.
 *
 * Maintained manually (DirectAggregate): entries are inserted only when a
 * review is PUBLISHED (moderation cleared) and removed when it is unpublished
 * or deleted, so pending/flagged reviews never affect the public rating.
 *
 * Namespace: barbershopId
 * Key:       review _creationTime (id disambiguates ties)
 * Id:        reviewId
 * sumValue:  rating (1-5)
 */
export const reviewRatingsAggregate = new DirectAggregate<{
  Namespace: Barbershop["_id"];
  Key: number;
  Id: Review["_id"];
}>(components.aggregateReviewRatings);

/**
 * Average rating + published-review count for one barbershop, read from the
 * rating aggregate in O(log n). Single source of truth for both the listing
 * card (`getActive`) and the detail page (`getBarbershopRating`).
 */
export async function getBarbershopRatingValue(
  ctx: QueryCtx,
  barbershopId: Barbershop["_id"],
) {
  const [sum, count] = await Promise.all([
    reviewRatingsAggregate.sum(ctx, { namespace: barbershopId }),
    reviewRatingsAggregate.count(ctx, { namespace: barbershopId }),
  ]);

  return { average: count > 0 ? sum / count : 0, count };
}

/**
 * Triggers that keep `smsUsageAggregate` and `emailUsageAggregate` in sync
 * automatically whenever the `usage` table is written through `usageTriggers`.
 *
 * Use `usageTriggers.wrapDB(ctx).db` instead of `ctx.db` in mutations that
 * write to the `usage` table so that aggregate updates fire automatically.
 */
export const usageTriggers = new Triggers<DataModel>();

usageTriggers.register("usage", smsUsageAggregate.trigger());
usageTriggers.register("usage", emailUsageAggregate.trigger());

/**
 * Total inventory valuation per barbershop: Σ (onHand × unitCost) over
 * `inventoryLevels` docs, read in O(log n). `unitCost` is denormalized onto
 * the level doc precisely so this sumValue lives entirely on the aggregated
 * document — cost changes must patch the level through `inventoryTriggers`
 * or the valuation silently goes stale.
 *
 * Namespace: barbershopId
 * Key:       itemId (string) — allows per-item bounds if ever needed
 * sumValue:  onHand * unitCost
 */
export const inventoryValueAggregate = new TableAggregate<{
  Namespace: Barbershop["_id"];
  Key: string;
  DataModel: DataModel;
  TableName: "inventoryLevels";
}>(components.aggregateInventoryValue, {
  namespace: (doc) => doc.barbershopId,
  sortKey: (doc) => doc.itemId,
  sumValue: (doc) => doc.onHand * doc.unitCost,
});

/**
 * Units moved per (type, time) per barbershop over the movements ledger —
 * answers "consumed/sold/received this period" via prefix + range bounds,
 * with Bogotá-local period boundaries computed at query time.
 *
 * Namespace: barbershopId
 * Key:       [movement type, _creationTime]
 * sumValue:  |quantity|
 */
export const inventoryMovementsAggregate = new TableAggregate<{
  Namespace: Barbershop["_id"];
  Key: [string, number];
  DataModel: DataModel;
  TableName: "inventoryMovements";
}>(components.aggregateInventoryMovements, {
  namespace: (doc) => doc.barbershopId,
  sortKey: (doc) => [doc.type, doc._creationTime],
  sumValue: (doc) => Math.abs(doc.quantity),
});

/**
 * Triggers that keep both inventory aggregates in sync. EVERY write to
 * `inventoryLevels` or `inventoryMovements` must go through
 * `inventoryTriggers.wrapDB(ctx).db` — a plain `ctx.db` write silently
 * desyncs the aggregates. Sanctioned writers: `recordMovement` and the
 * cost fan-out + retention rollup in `convex/inventory.ts`.
 */
export const inventoryTriggers = new Triggers<DataModel>();

inventoryTriggers.register(
  "inventoryLevels",
  inventoryValueAggregate.trigger(),
);
inventoryTriggers.register(
  "inventoryMovements",
  inventoryMovementsAggregate.trigger(),
);
