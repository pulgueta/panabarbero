import { api, internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
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

  await Promise.all([
    ...appointments.map((appointment) => ctx.db.delete(appointment._id)),
    ...services.map((service) => ctx.db.delete(service._id)),
    ...assignments.map((assignment) => ctx.db.delete(assignment._id)),
    ...members.map((member) => ctx.db.delete(member._id)),
    ...reviews.map((review) => ctx.db.delete(review._id)),
    ...(metadata ? [ctx.db.delete(metadata._id)] : []),
    ...usageRows.map((row) => ctx.db.delete(row._id)),
    ...(extraCreditsRow ? [ctx.db.delete(extraCreditsRow._id)] : []),
    ...creditPurchasesRows.map((row) => ctx.db.delete(row._id)),
    barbershopGeospatial.remove(ctx, barbershopId),
  ]);

  await ctx.db.delete(barbershopId);

  return { appointments, members };
}
