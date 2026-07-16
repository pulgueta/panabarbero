import type { FunctionReference } from "convex/server";
import { z } from "zod";

import { zInternalMutation } from ".";
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
import { r2 } from "./r2";
import type { Appointment, Barbershop, BarbershopMember } from "./schema";
import { barbershops } from "./schema";

/**
 * Bounded sale scan for the inline-vs-batched decision. Every sale contributes
 * at least two estimated rows (the sale plus ≥1 line), so seeing more than
 * `INLINE_CASCADE_LIMIT / 2` sales already forces batched mode — reading the
 * rest would only risk the per-transaction read budget on high-volume shops.
 */
const SALE_SCAN_CAP = INLINE_CASCADE_LIMIT / 2 + 1;

/** Sales examined per invocation of the paged proof cleanup below. */
const PROOF_CLEANUP_PAGE_SIZE = 200;

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
 *    In batched mode the sale-proof cleanup pages through `inventorySales`
 *    first (`deleteSaleProofsPage`) and starts the cascade from its last page,
 *    keeping every transaction inside the per-mutation read budget.
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
        .take(SALE_SCAN_CAP),
    ]);

  // Cap hit ⇒ the sale tree alone exceeds the inline budget; the rows are
  // handled by the paged cleanup + batched cascade without ever being fully
  // read here.
  const salesTruncated = inventorySales.length >= SALE_SCAN_CAP;

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
  // inline vs batched, and those never move the total by thousands. The sales
  // rollups (inventorySalesDaily/Items) are skipped too: their row count is
  // bounded by the sales + lines terms already in the sum, so the true tree
  // stays within ~2x the estimate — far inside the per-mutation budgets.
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

  if (salesTruncated || estimatedRows > INLINE_CASCADE_LIMIT) {
    // Batched mode: the sale proofs are cleaned in pages first — the full row
    // set may not fit one transaction's read budget — and the last page kicks
    // off the batched cascade, so every proofKey is read before its row dies.
    await ctx.scheduler.runAfter(
      0,
      internal.barbershopCascade.deleteSaleProofsPage,
      { barbershopId, cursor: null },
    );
  } else {
    for (const sale of inventorySales) {
      if (sale.proofKey) {
        try {
          await r2.deleteObject(ctx, sale.proofKey);
        } catch {
          // Non-fatal: object may already be gone
        }
      }
    }

    await cascadingDelete.deleteWithCascade(
      withCascadeTriggers(ctx),
      "barbershops",
      barbershopId,
    );
  }

  return { appointments, members };
}

async function startBatchedTeardown(
  ctx: MutationCtx,
  barbershopId: Barbershop["_id"],
) {
  await cascadingDelete.deleteWithCascadeBatched(
    withCascadeTriggers(ctx),
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
}

/**
 * Paged sale-proof cleanup for batched teardowns. Each invocation reads one
 * page of the shop's sales, deletes their R2 proofs, and reschedules itself;
 * the final page starts the batched row cascade. Rows are stable meanwhile:
 * the shop is tombstoned and member authz is revoked before this is scheduled,
 * so nothing can write new sales, and no rows are deleted until the cascade
 * this job launches at the end.
 */
export const deleteSaleProofsPage = zInternalMutation({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
    cursor: z.union([z.string(), z.null()]),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("inventorySales")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .paginate({ numItems: PROOF_CLEANUP_PAGE_SIZE, cursor: args.cursor });

    for (const sale of result.page) {
      if (sale.proofKey) {
        try {
          await r2.deleteObject(ctx, sale.proofKey);
        } catch {
          // Non-fatal: object may already be gone
        }
      }
    }

    if (result.isDone) {
      await startBatchedTeardown(ctx, args.barbershopId);
      return null;
    }

    await ctx.scheduler.runAfter(
      0,
      internal.barbershopCascade.deleteSaleProofsPage,
      { barbershopId: args.barbershopId, cursor: result.continueCursor },
    );

    return null;
  },
});
