import type { FunctionReference } from "convex/server";

import { api, internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import {
  completedAppointmentsAggregate,
  inventoryMovementsAggregate,
  reviewRatingsAggregate,
} from "./aggregates";
import { getMemberWorkosUserId, revokeMemberAuthz } from "./authz";
import {
  CASCADE_BATCH_SIZE,
  cascadingDelete,
  INLINE_CASCADE_LIMIT,
  withCascadeTriggers,
} from "./cascade";
import { barbershopGeospatial } from "./geospatial";
import type { Appointment, Barbershop, BarbershopMember } from "./schema";

/**
 * Structural teardown shared by `barbershops.deleteCascade` and the
 * account-deletion flow in `auth.ts`, in two phases:
 *
 * 1. Side-effect hooks, while the rows are still readable: cancel the
 *    appointments' scheduled notifications, drain the completed-appointments
 *    and review-ratings aggregates, revoke member authz roles, delete R2
 *    objects (logo, item photos), remove the geospatial entry, and schedule
 *    the WorkOS-org and RAG-namespace cleanups.
 * 2. Row teardown via the cascading-delete component (`barbershops` rules in
 *    `cascade.ts`), through the trigger-wrapped db so the usage/inventory
 *    aggregates stay in sync. Small trees delete atomically inline; trees
 *    above `INLINE_CASCADE_LIMIT` run in scheduled batches (the shop is
 *    deactivated up front so nothing books into a half-deleted barbershop).
 *
 * The caller MUST have already authorized the deletion — this helper performs
 * no ownership/role check. It returns the fetched `appointments` and `members`
 * so callers that notify affected parties can do so without re-querying.
 */
export async function cascadeDeleteBarbershop(
  ctx: MutationCtx,
  barbershop: Barbershop,
): Promise<{
  appointments: Appointment[];
  members: BarbershopMember[];
}> {
  const barbershopId = barbershop._id;

  // Tombstone first: public listings and booking flows filter on isActive, so
  // a batched teardown never exposes a half-deleted shop.
  if (barbershop.isActive) {
    await ctx.db.patch(barbershopId, { isActive: false });
  }

  const [appointments, members, reviews, inventoryItemRows, inventorySales] =
    await Promise.all([
      ctx.db
        .query("appointments")
        .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
        .collect(),
      ctx.db
        .query("barbershopMembers")
        .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
        .collect(),
      ctx.db
        .query("reviews")
        .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
        .collect(),
      ctx.db
        .query("inventoryItems")
        .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
        .collect(),
      ctx.db
        .query("inventorySales")
        .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
        .collect(),
    ]);

  // Cancel pending scheduled notifications before deleting appointment rows.
  const scheduledIds = appointments.flatMap((appointment) =>
    [
      appointment.upcomingNotificationId,
      appointment.pastReminderNotificationId,
    ].filter((id): id is NonNullable<typeof id> => id != null),
  );

  await Promise.all(
    scheduledIds.map(async (id) => {
      try {
        await ctx.scheduler.cancel(id);
      } catch {
        // Already completed, failed, or cancelled — safe to ignore
      }
    }),
  );

  // Drain the manually-maintained aggregates while the rows still exist.
  for (const appointment of appointments) {
    if (appointment.status === "completed") {
      await completedAppointmentsAggregate.deleteIfExists(ctx, {
        namespace: barbershopId,
        key: appointment.date,
        id: appointment._id,
      });
    }
  }

  for (const review of reviews) {
    if (review.publishedAt) {
      await reviewRatingsAggregate.deleteIfExists(ctx, {
        namespace: barbershopId,
        key: review._creationTime,
        id: review._id,
      });
    }
  }

  if (barbershop.logoKey) {
    try {
      await ctx.runMutation(api.r2.deleteR2Object, { key: barbershop.logoKey });
    } catch {
      // Non-fatal: object may already be gone
    }
  }

  for (const item of inventoryItemRows) {
    if (item.imageKey) {
      try {
        await ctx.runMutation(api.r2.deleteR2Object, { key: item.imageKey });
      } catch {
        // Non-fatal: object may already be gone
      }
    }
  }

  for (const sale of inventorySales) {
    if (sale.proofKey) {
      try {
        await ctx.runMutation(api.r2.deleteR2Object, { key: sale.proofKey });
      } catch {
        // Non-fatal: object may already be gone
      }
    }
  }

  if (barbershop.workosOrganizationId) {
    await ctx.scheduler.runAfter(0, internal.workosOrgs.deleteOrganization, {
      workosOrganizationId: barbershop.workosOrganizationId,
    });
  }

  // Mirror: drop the members' scoped authz roles before their rows go away.
  // Members are also deactivated up front: role checks that trust
  // `member.isActive` (e.g. `appointments.setStatus`) must stop authorizing
  // immediately, and in batched mode the member rows survive until a
  // scheduled batch reaches them.
  for (const member of members) {
    if (member.isActive) {
      await ctx.db.patch(member._id, { isActive: false });
    }

    const workosUserId = await getMemberWorkosUserId(ctx, member);

    if (workosUserId) {
      await revokeMemberAuthz(ctx, { userId: workosUserId, barbershopId });
    }
  }

  await barbershopGeospatial.remove(ctx, barbershopId);

  // The shop's RAG knowledge base lives in the rag component — invisible to
  // the row cascade, so it gets its own cleanup.
  await ctx.scheduler.runAfter(0, internal.aiRag.deleteShopKnowledge, {
    barbershopId,
  });

  // Row teardown. The movements ledger dominates large shops; its aggregate
  // gives the count in O(log n) without reading the rows. The estimate skips
  // the small tables (services, usage, credits…) on purpose — it only picks
  // inline vs batched, and those never move the total by thousands.
  const movementCount = await inventoryMovementsAggregate.count(ctx, {
    namespace: barbershopId,
  });
  const saleLineCount = inventorySales.reduce(
    (count, sale) => count + sale.lineCount,
    0,
  );
  const estimatedRows =
    appointments.length +
    members.length +
    reviews.length +
    inventoryItemRows.length +
    inventorySales.length +
    saleLineCount +
    movementCount;

  const cascadeCtx = withCascadeTriggers(ctx);

  if (estimatedRows > INLINE_CASCADE_LIMIT) {
    await cascadingDelete.deleteWithCascadeBatched(
      cascadeCtx,
      "barbershops",
      barbershopId,
      {
        // The component types the ref as public, but createFunctionHandle
        // accepts internal refs — and the worker must not be public.
        batchHandlerRef: internal.cascade
          .batchDeleteHandler as unknown as FunctionReference<"mutation">,
        batchSize: CASCADE_BATCH_SIZE,
      },
    );
  } else {
    await cascadingDelete.deleteWithCascade(
      cascadeCtx,
      "barbershops",
      barbershopId,
    );
  }

  return { appointments, members };
}
