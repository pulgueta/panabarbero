import { api, internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { inventoryTriggers, reviewRatingsAggregate } from "./aggregates";
import { getMemberWorkosUserId, revokeMemberAuthz } from "./authz";
import { barbershopGeospatial } from "./geospatial";
import type { Appointment, Barbershop, BarbershopMember } from "./schema";

/**
 * Structural teardown shared by `barbershops.deleteBarbershopCascade` and the
 * account-deletion flow in `auth.ts`. Deletes a barbershop and every row that
 * references it (appointments, services, member-service assignments, members,
 * reviews, metadata, usage, extra credits, credit purchases), cancels the
 * appointments' scheduled notifications, removes the geospatial entry, and
 * fires the external cleanups (R2 logo object, WorkOS organization).
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

  const [
    appointments,
    members,
    services,
    assignments,
    reviews,
    metadata,
    usageRows,
    extraCreditsRow,
    creditPurchasesRows,
  ] = await Promise.all([
    ctx.db
      .query("appointments")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
      .collect(),
    ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
      .collect(),
    ctx.db
      .query("services")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
      .collect(),
    ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
      .collect(),
    ctx.db
      .query("reviews")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
      .collect(),
    ctx.db
      .query("barbershopMetadata")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
      .unique(),
    ctx.db
      .query("usage")
      .withIndex("by_barbershop_month", (q) =>
        q.eq("barbershopId", barbershopId),
      )
      .collect(),
    ctx.db
      .query("extraCredits")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
      .unique(),
    ctx.db
      .query("creditPurchases")
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

  if (barbershop.logoKey) {
    try {
      await ctx.runMutation(api.r2.deleteR2Object, { key: barbershop.logoKey });
    } catch {
      // Non-fatal: object may already be gone
    }
  }

  if (barbershop.workosOrganizationId) {
    await ctx.scheduler.runAfter(0, internal.workosOrgs.deleteOrganization, {
      workosOrganizationId: barbershop.workosOrganizationId,
    });
  }

  // Mirror: drop the members' scoped authz roles before their rows go away.
  for (const member of members) {
    const workosUserId = await getMemberWorkosUserId(ctx, member);

    if (workosUserId) {
      await revokeMemberAuthz(ctx, { userId: workosUserId, barbershopId });
    }
  }

  // Inventory teardown: levels/movements go through the trigger-wrapped db so
  // the aggregates don't leak; item photos are removed from R2.
  const [inventoryItemRows, levelRows, movementRows, recipeRows, summaryRows] =
    await Promise.all([
      ctx.db
        .query("inventoryItems")
        .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
        .collect(),
      ctx.db
        .query("inventoryLevels")
        .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
        .collect(),
      ctx.db
        .query("inventoryMovements")
        .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
        .collect(),
      ctx.db
        .query("serviceInventoryUsage")
        .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
        .collect(),
      ctx.db
        .query("inventoryMovementSummaries")
        .withIndex("by_barbershopId_and_month", (q) =>
          q.eq("barbershopId", barbershopId),
        )
        .collect(),
    ]);

  for (const item of inventoryItemRows) {
    if (item.imageKey) {
      try {
        await ctx.runMutation(api.r2.deleteR2Object, { key: item.imageKey });
      } catch {
        // Non-fatal: object may already be gone
      }
    }
  }

  const inventoryDb = inventoryTriggers.wrapDB(ctx).db;

  for (const level of levelRows) {
    await inventoryDb.delete(level._id);
  }

  for (const movement of movementRows) {
    await inventoryDb.delete(movement._id);
  }

  await Promise.all([
    ...inventoryItemRows.map((item) => ctx.db.delete(item._id)),
    ...recipeRows.map((line) => ctx.db.delete(line._id)),
    ...summaryRows.map((summary) => ctx.db.delete(summary._id)),
  ]);

  await Promise.all([
    ...appointments.map((appointment) => ctx.db.delete(appointment._id)),
    ...services.map((service) => ctx.db.delete(service._id)),
    ...assignments.map((assignment) => ctx.db.delete(assignment._id)),
    ...members.map((member) => ctx.db.delete(member._id)),
    ...reviews.flatMap((review) =>
      review.publishedAt
        ? [
            reviewRatingsAggregate.deleteIfExists(ctx, {
              namespace: barbershopId,
              key: review._creationTime,
              id: review._id,
            }),
            ctx.db.delete(review._id),
          ]
        : [ctx.db.delete(review._id)],
    ),
    ...(metadata ? [ctx.db.delete(metadata._id)] : []),
    ...usageRows.map((row) => ctx.db.delete(row._id)),
    ...(extraCreditsRow ? [ctx.db.delete(extraCreditsRow._id)] : []),
    ...creditPurchasesRows.map((row) => ctx.db.delete(row._id)),
    barbershopGeospatial.remove(ctx, barbershopId),
  ]);

  await ctx.db.delete(barbershopId);

  return { appointments, members };
}
