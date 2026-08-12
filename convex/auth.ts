import { z } from "zod";

import { zQuery } from ".";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { getEntitledProductKey } from "./acl";
import {
  reviewRatingsAggregate,
  reviewStarsAggregate,
  reviewStarsNamespace,
} from "./aggregates";
import { identifyUser, track } from "./analytics";
import { authkit } from "./auth.config";
import { assertShopRole, authz, revokeMemberAuthz } from "./authz";
import { cascadeDeleteBarbershop } from "./barbershopCascade";
import { getUserId } from "./identity";
import { releaseForAppointment } from "./inventory";
import { getLimitsForProductKey, getTierForProductKey } from "./plans";
import { polar } from "./polar";
import type { Appointment, Barbershop, BarbershopMember } from "./schema";
import { barbershops } from "./schema";
import { getProfileByUserId } from "./userProfileData";
import {
  DAY_MAP,
  minutesOfDay,
  parseTimeToMinutes,
  toColombiaDateKey,
} from "./utils";

export const { backfillUsers } = authkit.utils();

function fullName(
  firstName?: string | null,
  lastName?: string | null,
): string | undefined {
  return [firstName, lastName].filter(Boolean).join(" ") || undefined;
}

/**
 * Returns the first active barber at the barbershop (excluding the departing
 * member) who offers the appointment's service and is available at its time slot.
 */
async function findAvailableBarberForSlot(
  ctx: MutationCtx,
  barbershop: Barbershop,
  appointment: Appointment,
  candidates: BarbershopMember[],
): Promise<BarbershopMember | null> {
  const dateKey = toColombiaDateKey(appointment.date);
  const [year, month, day] = dateKey.split("-").map(Number);
  const dayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const dayName = DAY_MAP[dayIndex];
  const apptMinutes = minutesOfDay(appointment.date);
  const lineServiceIds = appointment.items?.length
    ? appointment.items.map((line) => line.serviceId)
    : [appointment.serviceId];

  for (const candidate of candidates) {
    const assignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", candidate._id),
      )
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();
    const assignedServiceIds = new Set(
      assignments.map((assignment) => assignment.serviceId),
    );

    if (!lineServiceIds.every((serviceId) => assignedServiceIds.has(serviceId)))
      continue;

    const schedule = candidate.availability ?? barbershop.availability;
    const daySchedule = schedule.find((s) => s.weekDay.day === dayName);

    if (!daySchedule?.weekDay.isActive) continue;

    const openMin = parseTimeToMinutes(daySchedule.openAt);
    const closeMin = parseTimeToMinutes(daySchedule.closeAt);

    if (apptMinutes < openMin || apptMinutes >= closeMin) continue;

    if (daySchedule.lunchStart && daySchedule.lunchEnd) {
      const lunchStart = parseTimeToMinutes(daySchedule.lunchStart);
      const lunchEnd = parseTimeToMinutes(daySchedule.lunchEnd);
      if (apptMinutes >= lunchStart && apptMinutes < lunchEnd) continue;
    }

    return candidate;
  }

  return null;
}

/**
 * Reassigns or cancels all active upcoming appointments for a departing
 * member, then notifies affected customers and the shop owner.
 * Does NOT delete the member row — the caller is responsible for that.
 */
async function handleBarberDeparture(
  ctx: MutationCtx,
  member: BarbershopMember,
  barbershop: Barbershop,
): Promise<void> {
  const now = Date.now();

  const upcomingAppointments = await ctx.db
    .query("appointments")
    .withIndex("by_barbershopMemberId", (q) =>
      q.eq("barbershopMemberId", member._id),
    )
    .filter((q) =>
      q.and(
        q.eq(q.field("deletedAt"), undefined),
        q.gte(q.field("date"), now),
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "confirmed"),
          q.eq(q.field("status"), "rescheduled"),
        ),
      ),
    )
    .collect();

  if (upcomingAppointments.length === 0) {
    return;
  }

  const [memberProfile, allShopMembers] = await Promise.all([
    ctx.db.get(member.userProfileDataId),
    ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershop._id))
      .collect(),
  ]);

  const barberCandidates = allShopMembers.filter(
    (m) => m._id !== member._id && m.isActive && m.roles.includes("barber"),
  );

  const barberName = memberProfile?.name ?? "el barbero";

  const reassignedItems: Array<{
    appointmentId: Appointment["_id"];
    newBarberName: string;
  }> = [];
  const cancelledIds: Array<Appointment["_id"]> = [];

  for (const appt of upcomingAppointments) {
    const newBarber = await findAvailableBarberForSlot(
      ctx,
      barbershop,
      appt,
      barberCandidates,
    );

    if (newBarber) {
      await ctx.db.patch(appt._id, { barbershopMemberId: newBarber._id });
      const newBarberProfile = await ctx.db.get(newBarber.userProfileDataId);
      reassignedItems.push({
        appointmentId: appt._id,
        newBarberName: newBarberProfile?.name ?? "barbero disponible",
      });
    } else {
      await releaseForAppointment(
        ctx,
        appt,
        "Cita cancelada porque el barbero ya no pertenece a la barbería.",
      );
      await ctx.db.patch(appt._id, {
        deletedAt: now,
        status: "cancelled",
        notes:
          "Cita cancelada porque el barbero ya no pertenece a la barbería.",
        proposedDate: undefined,
        rescheduleRequestedByUserId: undefined,
      });
      cancelledIds.push(appt._id);
    }
  }

  // Notify customers of cancellations via existing notification infrastructure
  await Promise.all(
    upcomingAppointments
      .filter((a) => cancelledIds.includes(a._id))
      .map((appt) =>
        ctx.runMutation(
          internal.notifications.createBarberRemovedCancellation,
          {
            appointmentId: appt._id,
            customerUserId: appt.userId,
            barberName,
            barbershopName: barbershop.name,
            contactPhone: appt.contactPhone,
            contactEmail: appt.contactEmail,
          },
        ),
      ),
  );

  // Email customers whose appointments were reassigned
  const reassignedEmailNotifs = upcomingAppointments
    .filter((a) => reassignedItems.some((r) => r.appointmentId === a._id))
    .flatMap((appt) => {
      if (!appt.contactEmail) return [];
      const item = reassignedItems.find((r) => r.appointmentId === appt._id);
      if (!item) return [];
      return [
        {
          to: appt.contactEmail,
          barbershopName: barbershop.name,
          newBarberName: item.newBarberName,
        },
      ];
    });

  if (reassignedEmailNotifs.length > 0) {
    await ctx.scheduler.runAfter(
      0,
      internal.emails.sendAppointmentReassignedEmails,
      { notifications: reassignedEmailNotifs },
    );
  }

  // Notify shop owner with a summary
  const ownerProfile = await ctx.db
    .query("userProfileData")
    .withIndex("by_userId", (q) => q.eq("userId", barbershop.ownerId))
    .unique();

  if (ownerProfile?.email) {
    await ctx.scheduler.runAfter(
      0,
      internal.emails.sendMemberDepartureSummaryToOwner,
      {
        to: ownerProfile.email,
        barberName,
        barbershopName: barbershop.name,
        reassignedCount: reassignedItems.length,
        cancelledCount: cancelledIds.length,
      },
    );
  }
}

/**
 * Mirror an active WorkOS organization membership into `barbershopMembers`.
 * A pending membership (created at invite-send time) is ignored; acceptance
 * flips it to `active` (delivered as `organization_membership.updated`).
 */
async function scheduleMembershipSync(
  ctx: MutationCtx,
  membership: {
    organizationId: string;
    userId: string;
    status: string;
    role: { slug: string };
  },
) {
  if (membership.status !== "active") {
    return;
  }

  await ctx.scheduler.runAfter(0, internal.invitations.syncWorkosMembership, {
    organizationId: membership.organizationId,
    userId: membership.userId,
    roleSlug: membership.role.slug,
    attempt: 0,
  });
}

/**
 * Remove the local membership row when a WorkOS organization membership is
 * deleted (invite revoked, or member removed in the WorkOS dashboard). The
 * owner row and already-removed rows are left untouched.
 */
async function removeMembership(
  ctx: MutationCtx,
  membership: { organizationId: string; userId: string },
) {
  const barbershop = await ctx.db
    .query("barbershops")
    .withIndex("by_workosOrganizationId", (q) =>
      q.eq("workosOrganizationId", membership.organizationId),
    )
    .unique();

  if (!barbershop || membership.userId === barbershop.ownerId) {
    return;
  }

  const profile = await getProfileByUserId(ctx, membership.userId);

  if (!profile) {
    return;
  }

  const member = await ctx.db
    .query("barbershopMembers")
    .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershop._id))
    .filter((q) => q.eq(q.field("userProfileDataId"), profile._id))
    .first();

  if (member) {
    await handleBarberDeparture(ctx, member, barbershop);
    await ctx.db.delete(member._id);
    await revokeMemberAuthz(ctx, {
      userId: membership.userId,
      barbershopId: barbershop._id,
    });
  }
}

export const { authKitEvent } = authkit.events({
  "user.created": async (ctx, event) => {
    const { id: userId, email, firstName, lastName } = event.data;

    // Webhooks can be retried — only insert the profile once.
    const existing = await getProfileByUserId(ctx, userId);

    if (!existing) {
      await ctx.db.insert("userProfileData", {
        userId,
        email,
        name: fullName(firstName, lastName),
        notificationsPreferences: [
          { type: "email", enabled: true },
          { type: "sms", enabled: false },
        ],
      });

      await ctx.scheduler.runAfter(0, internal.emails.sendWelcomeEmail, {
        to: email,
      });

      await track(ctx, {
        distinctId: userId,
        event: "user_signed_up",
        properties: { email },
      });
    }

    await identifyUser(ctx, userId, {
      email,
      name: fullName(firstName, lastName),
    });
  },
  "user.updated": async (ctx, event) => {
    const { id: userId, email, firstName, lastName } = event.data;

    const profile = await getProfileByUserId(ctx, userId);

    if (!profile) {
      return;
    }

    const name = fullName(firstName, lastName);

    await ctx.db.patch(profile._id, {
      email,
      ...(name ? { name } : {}),
    });
  },
  "user.deleted": async (ctx, event) => {
    const userId = event.data.id;
    const profile = await getProfileByUserId(ctx, userId);

    if (!profile) {
      return;
    }

    const emailsToNotify: Array<{
      to: string;
      barbershopName: string;
      affectedAs: "staff" | "customer";
    }> = [];

    // 1. Cascade-delete every barbershop owned by this user
    const ownedBarbershops = await ctx.db
      .query("barbershops")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .collect();

    for (const barbershop of ownedBarbershops) {
      const { appointments, members } = await cascadeDeleteBarbershop(
        ctx,
        barbershop,
      );

      // Collect non-owner member emails (staff/barbers whose workplace is closing)
      for (const member of members) {
        if (member.userProfileDataId === profile._id) continue;
        const memberProfile = await ctx.db.get(member.userProfileDataId);
        if (memberProfile?.email) {
          emailsToNotify.push({
            to: memberProfile.email,
            barbershopName: barbershop.name,
            affectedAs: "staff",
          });
        }
      }

      // Collect customer emails from upcoming, non-final appointments
      const now = Date.now();
      for (const appt of appointments) {
        if (
          appt.contactEmail &&
          appt.date > now &&
          (appt.status === "pending" ||
            appt.status === "confirmed" ||
            appt.status === "rescheduled")
        ) {
          emailsToNotify.push({
            to: appt.contactEmail,
            barbershopName: barbershop.name,
            affectedAs: "customer",
          });
        }
      }
    }

    // 2. Handle memberships where user was barber/staff at other shops:
    //    reassign/cancel their appointments, notify affected parties, then delete the row.
    const memberRows = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_userProfileDataId", (q) =>
        q.eq("userProfileDataId", profile._id),
      )
      .collect();

    for (const memberRow of memberRows) {
      // Owner rows were already deleted in step 1; skip any that slipped through.
      if (memberRow.roles.includes("owner")) continue;

      const memberBarbershop = await ctx.db.get(memberRow.barbershopId);
      if (memberBarbershop) {
        await handleBarberDeparture(ctx, memberRow, memberBarbershop);
      }
      await ctx.db.delete(memberRow._id);
    }

    // Mirror: drop every scoped authz role this user held anywhere.
    await authz.revokeAllRoles(ctx, userId);

    // 3. Delete user's own reviews
    const userReviews = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    await Promise.all(
      userReviews.map(async (r) => {
        if (r.publishedAt) {
          await reviewRatingsAggregate.deleteIfExists(ctx, {
            namespace: r.barbershopId,
            key: r._creationTime,
            id: r._id,
          });
          await reviewStarsAggregate.deleteIfExists(ctx, {
            namespace: reviewStarsNamespace(r.barbershopId, r.rating),
            key: r._creationTime,
            id: r._id,
          });
        }

        await ctx.db.delete(r._id);
      }),
    );

    // 4. Delete user's in-app notifications
    const userNotifications = await ctx.db
      .query("inAppNotifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .collect();

    await Promise.all(userNotifications.map((n) => ctx.db.delete(n._id)));

    // 5. Delete profile
    await ctx.db.delete(profile._id);

    // 6. Notify affected staff and customers
    if (emailsToNotify.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendAccountDeletedNotifications,
        { notifications: emailsToNotify },
      );
    }
  },
  "organization_membership.created": async (ctx, event) => {
    await scheduleMembershipSync(ctx, event.data);
  },
  "organization_membership.updated": async (ctx, event) => {
    await scheduleMembershipSync(ctx, event.data);
  },
  "organization_membership.deleted": async (ctx, event) => {
    await removeMembership(ctx, event.data);
  },
});

export const getCurrentUser = zQuery({
  args: z.object({}),
  handler: async (ctx) => {
    const user = await authkit.getAuthUser(ctx);

    if (!user) {
      return null;
    }

    const profile = await getProfileByUserId(ctx, user.id);

    return {
      ...user,
      name: fullName(user.firstName, user.lastName) ?? profile?.name ?? null,
      image: profile?.image ?? user.profilePictureUrl ?? null,
    };
  },
});

/** Plan flags derived from a Polar subscription; only active/trialing entitles. */
function shapeSubscription(
  subscription: Awaited<ReturnType<typeof polar.getCurrentSubscription>>,
) {
  const planTier = getTierForProductKey(getEntitledProductKey(subscription));
  const planLimits = getLimitsForProductKey(
    getEntitledProductKey(subscription),
  );

  return {
    ...subscription,
    isSubscribed:
      subscription?.status === "active" || subscription?.status === "trialing",
    planTier,
    planLimits,
    // Backward-compatible boolean helpers
    isFree: planTier === "free",
    isPro: planTier === "pro",
    isPremium: planTier === "premium",
  };
}

export const getUserSubscription = zQuery({
  handler: async (ctx) => {
    const userId = await getUserId(ctx);

    if (!userId) {
      return null;
    }

    return shapeSubscription(
      await polar.getCurrentSubscription(ctx, { userId }),
    );
  },
});

/**
 * Returns the subscription/plan info for the **owner** of a barbershop.
 * Used by staff members to derive plan-based feature flags (e.g. whether
 * they can create appointments on behalf of clients).
 */
export const getBarbershopOwnerSubscription = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    if (!userId) {
      return null;
    }

    const barbershop = await ctx.db.get(args.id);

    if (!barbershop) {
      return null;
    }

    await assertShopRole(ctx, args.id, userId, ["barber", "owner", "staff"]);

    // Staff only need plan-derived flags — never the owner's billing record.
    const { isSubscribed, planTier, planLimits, isFree, isPro, isPremium } =
      shapeSubscription(
        await polar.getCurrentSubscription(ctx, { userId: barbershop.ownerId }),
      );

    return { isSubscribed, planTier, planLimits, isFree, isPro, isPremium };
  },
});
