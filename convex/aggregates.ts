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
import type { DataModel, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

/**
 * Counts completed appointments per barbershop.
 *
 * Namespace: barbershopId
 * Key:       appointment date (timestamp) — enables range queries by time
 * Id:        appointmentId (unique tie-breaker)
 */
export const completedAppointmentsAggregate = new DirectAggregate<{
  Namespace: Id<"barbershops">;
  Key: number;
  Id: Id<"appointments">;
}>(components.aggregateCompletedAppointments);

/**
 * Sums smsSent across all `usage` rows per barbershop.
 *
 * Namespace: barbershopId
 * Key:       month string (YYYY-MM) — enables range queries per month
 * sumValue:  smsSent
 */
export const smsUsageAggregate = new TableAggregate<{
  Namespace: Id<"barbershops">;
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
  Namespace: Id<"barbershops">;
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
  Namespace: Id<"barbershops">;
  Key: number;
  Id: Id<"reviews">;
}>(components.aggregateReviewRatings);

/**
 * Average rating + published-review count for one barbershop, read from the
 * rating aggregate in O(log n). Single source of truth for both the listing
 * card (`getActive`) and the detail page (`getBarbershopRating`).
 */
export async function getBarbershopRatingValue(
  ctx: QueryCtx,
  barbershopId: Id<"barbershops">,
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
