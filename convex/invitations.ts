import type { Locale } from "@workos-inc/node";
import { ConvexError } from "convex/values";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zAction, zInternalMutation, zInternalQuery } from ".";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { assertBarberInviteAllowed, assertStaffInviteAllowed } from "./acl";
import { authkit } from "./auth.config";
import { assertCanManageTeam, assertOwner } from "./authz";
import { getByUserIdFn } from "./barbershopMembers";
import { errorMessages } from "./errors";
import { requireUserId } from "./identity";
import { inviteBarberSchema } from "./invitationsSchema";
import { rateLimitOrThrow } from "./ratelimit";
import { getProfileByEmail, getProfileByUserId } from "./userProfileData";

/**
 * Team invitations are WorkOS Organization Invitations. The barbershop is
 * mirrored 1:1 to a WorkOS organization (`barbershops.workosOrganizationId`,
 * `externalId = barbershopId`), so sending an invite, hosting acceptance and
 * the invitation's expiry are all owned by WorkOS. Acceptance flips the
 * invitee's org membership to `active`, which arrives as an
 * `organization_membership.updated` webhook and is mirrored into
 * `barbershopMembers` by {@link syncWorkosMembership} (see `convex/auth.ts`).
 *
 * `barbershopMembers` remains the source of truth for app authorization; WorkOS
 * roles mirror it via these slugs:
 *   barber → `member`, staff → `staff`, owner → `admin` (set on shop creation).
 */

const INVITATION_EXPIRATION_DAYS = 5;
const FALLBACK_INVITE_LOCALE: Locale = "es-419";
const MEMBERSHIP_SYNC_MAX_ATTEMPTS = 5;
const MEMBERSHIP_SYNC_RETRY_MS = 2_000;

const APP_ROLE_TO_SLUG = {
  barber: "member",
  staff: "staff",
  owner: "admin",
} as const;

const SLUG_TO_APP_ROLE: Record<string, "barber" | "staff" | "owner"> = {
  member: "barber",
  staff: "staff",
  admin: "owner",
};

/**
 * Resolve the invitee's preferred locale for the WorkOS-hosted email, falling
 * back to LATAM Spanish. `User.locale` is already a valid WorkOS locale.
 */
async function resolveInviteLocale(email: string): Promise<Locale> {
  try {
    const { data } = await authkit.workos.userManagement.listUsers({ email });
    const locale = data[0]?.locale;

    if (locale) {
      return locale as Locale;
    }
  } catch {
    // Fall through to the LATAM Spanish default.
  }

  return FALLBACK_INVITE_LOCALE;
}

/**
 * Resolve the barbershop's WorkOS organization id. Org sync on shop creation is
 * fire-and-forget and may have failed silently — get-or-create by `externalId`
 * so an invite never dead-ends, persisting the id back to Convex.
 */
async function ensureOrganization(
  ctx: ActionCtx,
  prepared: {
    barbershopId: Id<"barbershops">;
    barbershopName: string;
    organizationId: string | null;
    ownerUserId: string;
  },
): Promise<string> {
  if (prepared.organizationId) {
    return prepared.organizationId;
  }

  let organizationId: string;

  try {
    const existing =
      await authkit.workos.organizations.getOrganizationByExternalId(
        prepared.barbershopId,
      );
    organizationId = existing.id;
  } catch {
    const created = await authkit.workos.organizations.createOrganization({
      name: prepared.barbershopName,
      externalId: prepared.barbershopId,
      metadata: { barbershopId: prepared.barbershopId },
    });

    await authkit.workos.userManagement.createOrganizationMembership({
      organizationId: created.id,
      userId: prepared.ownerUserId,
      roleSlug: APP_ROLE_TO_SLUG.owner,
    });

    organizationId = created.id;
  }

  await ctx.runMutation(internal.barbershops.setWorkosOrganizationId, {
    id: prepared.barbershopId,
    workosOrganizationId: organizationId,
  });

  return organizationId;
}

/**
 * Server-authoritative invite checks (caller auth, barbershop resolution, role
 * + plan gating, duplicate-member guard). Runs in a mutation so it can read the
 * DB; the public {@link invite} action consumes its result before calling WorkOS.
 */
export const prepareInvite = zInternalMutation({
  args: inviteBarberSchema,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    await rateLimitOrThrow(ctx, "inviteBarbershopMember", userId);

    // Owner first, then membership (staff invite barbers on behalf of the shop).
    let barbershop = await ctx.db
      .query("barbershops")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
      .first();

    if (!barbershop) {
      const membership = await getByUserIdFn(ctx, { userId });

      if (membership) {
        barbershop = await ctx.db.get(membership.barbershopId);
      }
    }

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    const role: "barber" | "staff" = args.roles.includes("staff")
      ? "staff"
      : "barber";

    // Authorization is authoritative and must fail before plan gating, so an
    // unauthorized caller can't observe entitlement state (or get a plan error
    // instead of a permission error) via a concurrent race.
    if (role === "staff") {
      await assertOwner(ctx, barbershop._id, userId);
      await assertStaffInviteAllowed(ctx, barbershop._id, barbershop.ownerId);
    } else {
      await assertCanManageTeam(ctx, barbershop._id, userId);
      await assertBarberInviteAllowed(ctx, barbershop._id, barbershop.ownerId);
    }

    const email = args.email.toLowerCase().trim();

    const userProfile = await getProfileByEmail(ctx, email);

    if (userProfile) {
      const existingMember = await ctx.db
        .query("barbershopMembers")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", barbershop._id),
        )
        .filter((q) => q.eq(q.field("userProfileDataId"), userProfile._id))
        .unique();

      if (existingMember) {
        throw new ConvexError("Este usuario ya es miembro de la barbería");
      }
    }

    return {
      barbershopId: barbershop._id,
      barbershopName: barbershop.name,
      organizationId: barbershop.workosOrganizationId ?? null,
      ownerUserId: barbershop.ownerId,
      email,
      roleSlug: APP_ROLE_TO_SLUG[role],
      inviterUserId: userId,
    };
  },
});

export const invite = zAction({
  args: inviteBarberSchema,
  handler: async (ctx, args) => {
    const prepared = await ctx.runMutation(
      internal.invitations.prepareInvite,
      args,
    );

    const organizationId = await ensureOrganization(ctx, prepared);

    const existing = await authkit.workos.userManagement.listInvitations({
      organizationId,
      email: prepared.email,
    });

    if (existing.data.some((inv) => inv.state === "pending")) {
      throw new ConvexError(
        "Ya existe una invitación activa para este correo.",
      );
    }

    const locale = await resolveInviteLocale(prepared.email);

    await authkit.workos.userManagement.sendInvitation({
      email: prepared.email,
      organizationId,
      roleSlug: prepared.roleSlug,
      inviterUserId: prepared.inviterUserId,
      expiresInDays: INVITATION_EXPIRATION_DAYS,
      locale,
    });
  },
});

/**
 * Assert the caller can manage the barbershop's team and resolve its WorkOS
 * organization id. Shared by the list/revoke/resend actions.
 */
export const getManageableOrganization = zInternalQuery({
  args: z.object({ barbershopId: zid("barbershops") }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const barbershop = await ctx.db.get(args.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    await assertCanManageTeam(ctx, args.barbershopId, userId);

    return { organizationId: barbershop.workosOrganizationId ?? null };
  },
});

export const listInvitations = zAction({
  args: z.object({ barbershopId: zid("barbershops") }),
  handler: async (ctx, args) => {
    const { organizationId } = await ctx.runQuery(
      internal.invitations.getManageableOrganization,
      { barbershopId: args.barbershopId },
    );

    if (!organizationId) {
      return [];
    }

    const result = await authkit.workos.userManagement.listInvitations({
      organizationId,
    });

    return result.data.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.roleSlug
        ? (SLUG_TO_APP_ROLE[inv.roleSlug] ?? "barber")
        : "barber",
      state: inv.state,
      expiresAt: inv.expiresAt,
    }));
  },
});

export const revokeInvitation = zAction({
  args: z.object({
    barbershopId: zid("barbershops"),
    invitationId: z.string(),
  }),
  handler: async (ctx, args) => {
    const { organizationId } = await ctx.runQuery(
      internal.invitations.getManageableOrganization,
      { barbershopId: args.barbershopId },
    );

    const invitation = await authkit.workos.userManagement.getInvitation(
      args.invitationId,
    );

    if (!organizationId || invitation.organizationId !== organizationId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await authkit.workos.userManagement.revokeInvitation(args.invitationId);
  },
});

export const resendInvitation = zAction({
  args: z.object({
    barbershopId: zid("barbershops"),
    invitationId: z.string(),
  }),
  handler: async (ctx, args) => {
    const { organizationId } = await ctx.runQuery(
      internal.invitations.getManageableOrganization,
      { barbershopId: args.barbershopId },
    );

    const invitation = await authkit.workos.userManagement.getInvitation(
      args.invitationId,
    );

    if (!organizationId || invitation.organizationId !== organizationId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const locale = await resolveInviteLocale(invitation.email);

    await authkit.workos.userManagement.resendInvitation(args.invitationId, {
      locale,
    });
  },
});

/**
 * Mirror an active WorkOS organization membership into `barbershopMembers`.
 * Scheduled from the `organization_membership.*` webhook. Idempotent: merges
 * roles into an existing row, enforces barber↔staff exclusivity, and
 * auto-assigns services to new barbers. The membership webhook can outrun the
 * `user.created` webhook (no profile yet) or the org-id write, so it retries a
 * bounded number of times before giving up.
 */
export const syncWorkosMembership = zInternalMutation({
  args: z.object({
    organizationId: z.string(),
    userId: z.string(),
    roleSlug: z.string(),
    attempt: z.number(),
  }),
  handler: async (ctx, args) => {
    const barbershop = await ctx.db
      .query("barbershops")
      .withIndex("by_workosOrganizationId", (q) =>
        q.eq("workosOrganizationId", args.organizationId),
      )
      .unique();

    const profile = await getProfileByUserId(ctx, args.userId);

    if (!barbershop || !profile) {
      if (args.attempt < MEMBERSHIP_SYNC_MAX_ATTEMPTS) {
        await ctx.scheduler.runAfter(
          MEMBERSHIP_SYNC_RETRY_MS,
          internal.invitations.syncWorkosMembership,
          { ...args, attempt: args.attempt + 1 },
        );
      }

      return;
    }

    // The owner's local row is authored synchronously by `barbershops.create`.
    if (args.userId === barbershop.ownerId) {
      return;
    }

    const appRole = SLUG_TO_APP_ROLE[args.roleSlug];

    // Only barber/staff are provisioned through invitations.
    if (appRole !== "barber" && appRole !== "staff") {
      return;
    }

    const existingMember = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershop._id))
      .filter((q) => q.eq(q.field("userProfileDataId"), profile._id))
      .first();

    if (existingMember) {
      // Barber and staff are mutually exclusive within a barbershop.
      if (appRole === "staff" && existingMember.roles.includes("barber")) {
        return;
      }

      if (appRole === "barber" && existingMember.roles.includes("staff")) {
        return;
      }

      const wasAlreadyBarber = existingMember.roles.includes("barber");
      const roles = [...new Set([...existingMember.roles, appRole])];

      await ctx.db.patch(existingMember._id, { roles, isActive: true });

      if (!wasAlreadyBarber && appRole === "barber") {
        await ctx.runMutation(
          internal.barbershopMemberServices.assignAllServicesToBarber,
          { id: existingMember._id },
        );
      }

      return;
    }

    const memberId = await ctx.db.insert("barbershopMembers", {
      barbershopId: barbershop._id,
      userProfileDataId: profile._id,
      roles: [appRole],
      isActive: true,
      joinedAt: Date.now(),
    });

    if (appRole === "barber") {
      await ctx.runMutation(
        internal.barbershopMemberServices.assignAllServicesToBarber,
        { id: memberId },
      );
    }
  },
});
