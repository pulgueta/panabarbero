/**
 * Aggregate definitions — efficient O(log n) counts and sums.
 *
 * Three aggregates are registered:
 *   - completedAppointmentsAggregate: count completed appointments per barbershop
 *   - smsUsageAggregate: sum smsSent per barbershop (across months)
 *   - emailUsageAggregate: sum emailsSent per barbershop (across months)
 */

import { DirectAggregate, TableAggregate } from "@convex-dev/aggregate";

import { components } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";

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
