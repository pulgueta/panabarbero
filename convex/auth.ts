import { z } from "zod";

import { zQuery } from ".";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { identifyUser, track } from "./analytics";
import { authkit } from "./auth.config";
import { assertShopRole } from "./authz";
import { getUserId } from "./identity";
import { getLimitsForProductKey, getTierForProductKey } from "./plans";
import { polar } from "./polar";
import { barbershops } from "./schema";
import { getProfileByUserId } from "./userProfileData";

export const { backfillUsers } = authkit.utils();

function fullName(
  firstName?: string | null,
  lastName?: string | null,
): string | undefined {
  return [firstName, lastName].filter(Boolean).join(" ") || undefined;
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
    await ctx.db.delete(member._id);
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
    }

    await Promise.all([
      identifyUser(ctx, userId, {
        email,
        name: fullName(firstName, lastName),
      }),
      track(ctx, {
        distinctId: userId,
        event: "user_signed_up",
        properties: { email },
      }),
    ]);
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
    const profile = await getProfileByUserId(ctx, event.data.id);

    if (profile) {
      await ctx.db.delete(profile._id);
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

export const getUserSubscription = zQuery({
  handler: async (ctx) => {
    const userId = await getUserId(ctx);

    if (!userId) {
      return null;
    }

    const subscription = await polar.getCurrentSubscription(ctx, {
      userId,
    });

    const planTier = getTierForProductKey(subscription?.productKey);
    const planLimits = getLimitsForProductKey(subscription?.productKey);

    return {
      ...subscription,
      isSubscribed:
        subscription?.status === "active" ||
        subscription?.status === "trialing",
      productPlanId: subscription?.productId,
      planTier,
      planLimits,
      // Backward-compatible boolean helpers
      isFree: planTier === "free",
      isPro: planTier === "pro",
      isPremium: planTier === "premium",
    };
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

    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: barbershop.ownerId,
    });

    const planTier = getTierForProductKey(subscription?.productKey);
    const planLimits = getLimitsForProductKey(subscription?.productKey);

    return {
      ...subscription,
      isSubscribed:
        subscription?.status === "active" ||
        subscription?.status === "trialing",
      productPlanId: subscription?.productId,
      planTier,
      planLimits,
      isFree: planTier === "free",
      isPro: planTier === "pro",
      isPremium: planTier === "premium",
    };
  },
});
