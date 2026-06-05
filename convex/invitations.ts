import { InviteLinks } from "convex-invite-links";
import { ConvexError } from "convex/values";
import { z } from "zod";

import { zMutation, zQuery } from ".";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { assertBarberInviteAllowed, assertStaffInviteAllowed } from "./acl";
import { authComponent } from "./auth";
import { assertCanManageTeam, assertOwner } from "./authz";
import { getByUserIdFn } from "./barbershopMembers";
import { errorMessages } from "./errors";
import { siteUrl } from "./notificationCopy";
import { rateLimitOrThrow } from "./ratelimit";
import { getProfileByEmail, getProfileByUserId } from "./userProfileData";
import { formatPhoneNumber } from "./utils";

const INVITATION_EXPIRATION_MS = 1000 * 60 * 60 * 24 * 5;

export const invites = new InviteLinks(components.inviteLinks, {
  defaultExpiryMs: INVITATION_EXPIRATION_MS,
  baseUrl: siteUrl(),
});

/**
 * App-specific data carried on each invite's `metadata`. The invite token is
 * the value used in the `/invitations/$code` link; the barbershop relation and
 * roles live here so acceptance can rebuild the `barbershopMembers` row. Invites
 * are scoped to the barbershop via the component's group feature
 * (`groupId === barbershop._id`).
 */
type InviteMeta = {
  roles: ("barber" | "staff")[];
  phone: string;
  barbershopId: Id<"barbershops">;
  inviterUserId: string;
};

export const inviteBarberSchema = z.object({
  phone: z.string(),
  email: z.string(),
  roles: z.array(z.enum(["barber", "staff"])).length(1),
});

/**
 * Revoke an expired invite and issue a fresh one with the same recipient and
 * metadata, then re-send the notification. Used when a recipient opens an
 * expired link or tries to accept one.
 */
async function renewExpiredInvite(
  ctx: MutationCtx,
  inv: { inviteId: string; email?: string; metadata?: unknown },
): Promise<void> {
  const meta = (inv.metadata ?? {}) as InviteMeta;

  if (!inv.email || !meta.barbershopId) {
    return;
  }

  await invites.revokeInvite(ctx, { inviteId: inv.inviteId });

  const expiresAt = Date.now() + INVITATION_EXPIRATION_MS;

  const { token } = await invites.makeInvite(ctx, {
    email: inv.email,
    groupId: meta.barbershopId,
    expiresAt,
    createdBy: meta.inviterUserId,
    metadata: meta,
  });

  await ctx.scheduler.runAfter(0, internal.notifications.createBarberInvited, {
    barbershopId: meta.barbershopId,
    email: inv.email,
    code: token,
    inviterUserId: meta.inviterUserId,
    roles: meta.roles,
    expiresAt,
    phone: meta.phone,
  });
}

export const invite = zMutation({
  args: inviteBarberSchema,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user || !user.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "inviteBarbershopMember", user._id);

    // Try to find barbershop via ownership first, then via membership (for staff)
    let barbershop = await ctx.db
      .query("barbershops")
      // biome-ignore lint/style/noNonNullAssertion: already checked
      .withIndex("by_ownerId", (q) => q.eq("ownerId", user.userId!))
      .first();

    if (!barbershop) {
      // Staff member — find barbershop through membership
      const membership = await getByUserIdFn(ctx, { userId: user.userId });
      if (membership) {
        barbershop = await ctx.db.get(membership.barbershopId);
      }
    }

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    const isInvitingStaff = args.roles.includes("staff");
    const isInvitingBarber = args.roles.includes("barber");

    if (isInvitingStaff) {
      // Only owner can invite staff
      await assertOwner(ctx, barbershop._id, user.userId);
      await assertStaffInviteAllowed(ctx, barbershop._id, barbershop.ownerId);
    } else if (isInvitingBarber) {
      // Owner or staff can invite barbers
      await assertCanManageTeam(ctx, barbershop._id, user.userId);
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

    // `listInvites` excludes claimed/revoked/expired by default, so any match
    // here is an active (pending) invite for this email.
    const activeInvites = await invites.listInvites(ctx, {
      groupId: barbershop._id,
    });

    if (activeInvites.some((i) => i.email?.toLowerCase() === email)) {
      throw new ConvexError(
        "Ya existe una invitación activa para este correo.",
      );
    }

    const expiresAt = Date.now() + INVITATION_EXPIRATION_MS;

    await invites.upsertGroup(ctx, {
      groupId: barbershop._id,
      name: barbershop.name,
    });

    const { token } = await invites.makeInvite(ctx, {
      email,
      groupId: barbershop._id,
      expiresAt,
      createdBy: user.userId,
      metadata: {
        roles: args.roles,
        phone: formatPhoneNumber(args.phone),
        barbershopId: barbershop._id,
        inviterUserId: user.userId,
      } satisfies InviteMeta,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.notifications.createBarberInvited,
      {
        barbershopId: barbershop._id,
        email,
        code: token,
        inviterUserId: user.userId,
        roles: args.roles,
        expiresAt,
        phone: args.phone,
      },
    );

    return token;
  },
});

export const getByCode = zQuery({
  args: z.object({ code: z.string() }),
  handler: async (ctx, args) => {
    const inv = await invites.getInviteByToken(ctx, { token: args.code });

    if (!inv) {
      return null;
    }

    const meta = (inv.metadata ?? {}) as InviteMeta;
    const now = Date.now();

    let status: "pending" | "accepted" | "denied" | "expired" = "pending";
    if (inv.claimedAt) {
      status = "accepted";
    } else if (inv.revokedAt) {
      status = "denied";
    }

    const isExpired =
      !inv.claimedAt &&
      !inv.revokedAt &&
      !!inv.expiresAt &&
      now > inv.expiresAt;

    const barbershop = meta.barbershopId
      ? await ctx.db.get(meta.barbershopId)
      : null;

    return {
      email: inv.email,
      roles: meta.roles ?? [],
      status,
      isExpired,
      barbershopName: barbershop?.name,
    };
  },
});

export const validate = zMutation({
  args: z.object({ code: z.string() }),
  handler: async (ctx, args) => {
    const inv = await invites.getInviteByToken(ctx, { token: args.code });

    if (!inv) {
      throw new ConvexError(errorMessages.notFound("invitación"));
    }

    if (inv.claimedAt) {
      return { status: "accepted" as const };
    }

    if (inv.revokedAt) {
      return { status: "denied" as const };
    }

    const isExpired = !!inv.expiresAt && inv.expiresAt <= Date.now();

    if (!isExpired) {
      return { status: "pending" as const };
    }

    await renewExpiredInvite(ctx, inv);

    return { status: "pending" as const };
  },
});

export const answer = zMutation({
  args: z.object({
    code: z.string(),
    answer: z.enum(["accept", "deny"]),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user || !user.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "answerInvitation", `${user._id}-${args.code}`);

    const inv = await invites.getInviteByToken(ctx, { token: args.code });

    if (!inv) {
      throw new ConvexError(errorMessages.notFound("invitación"));
    }

    if (inv.claimedAt || inv.revokedAt) {
      throw new ConvexError("La invitación ya fue gestionada.");
    }

    switch (args.answer) {
      case "accept": {
        if (inv.expiresAt && inv.expiresAt <= Date.now()) {
          await renewExpiredInvite(ctx, inv);

          throw new ConvexError(
            "La invitación ha expirado. Se ha reenviado un nuevo enlace.",
          );
        }

        const profile = await getProfileByUserId(ctx, user.userId ?? "");

        if (!profile) {
          throw new ConvexError(errorMessages.notFound("perfil de usuario"));
        }

        // Claim marks the invite as used and adds the user to the barbershop
        // group. If we throw afterwards (e.g. a role conflict), the whole
        // mutation transaction — including this claim — rolls back.
        const result = await invites.claimInvite(ctx, {
          token: args.code,
          userId: user.userId,
          email: profile.email,
        });

        if (!result.ok) {
          switch (result.reason) {
            case "email_mismatch":
              throw new ConvexError(
                "Esta invitación no corresponde a tu cuenta.",
              );
            case "already_claimed":
            case "revoked":
              throw new ConvexError("La invitación ya fue gestionada.");
            case "expired":
              await renewExpiredInvite(ctx, inv);
              throw new ConvexError(
                "La invitación ha expirado. Se ha reenviado un nuevo enlace.",
              );
            default:
              throw new ConvexError(errorMessages.notFound("invitación"));
          }
        }

        const meta = (result.metadata ?? inv.metadata ?? {}) as InviteMeta;
        const barbershopId =
          (result.groupId as Id<"barbershops"> | undefined) ??
          meta.barbershopId;

        const existingMember = await ctx.db
          .query("barbershopMembers")
          .withIndex("by_barbershopId", (q) =>
            q.eq("barbershopId", barbershopId),
          )
          .filter((q) => q.eq(q.field("userProfileDataId"), profile._id))
          .first();

        if (existingMember) {
          // Validate role exclusivity: barber can't become staff and vice versa
          const isInvitingStaff = meta.roles.includes("staff");
          const isInvitingBarber = meta.roles.includes("barber");

          if (isInvitingStaff && existingMember.roles.includes("barber")) {
            throw new ConvexError(
              "No puedes ser recepcionista si ya eres barbero en esta barbería.",
            );
          }

          if (isInvitingBarber && existingMember.roles.includes("staff")) {
            throw new ConvexError(
              "No puedes ser barbero si ya eres recepcionista en esta barbería.",
            );
          }

          // Merge invitation roles into the existing member's roles
          const wasAlreadyBarber = existingMember.roles.includes("barber");
          const mergedRoles = [
            ...new Set([...existingMember.roles, ...meta.roles]),
          ];
          await ctx.db.patch(existingMember._id, { roles: mergedRoles });

          // If the barber role was newly added, auto-assign all services
          if (!wasAlreadyBarber && mergedRoles.includes("barber")) {
            await ctx.runMutation(
              internal.barbershopMemberServices.assignAllServicesToBarber,
              { id: existingMember._id },
            );
          }

          return existingMember._id;
        }

        const memberId = await ctx.db.insert("barbershopMembers", {
          barbershopId,
          userProfileDataId: profile._id,
          roles: meta.roles,
          isActive: true,
          joinedAt: Date.now(),
        });

        // Only assign all services for barbers, not for staff
        if (meta.roles.includes("barber")) {
          await ctx.runMutation(
            internal.barbershopMemberServices.assignAllServicesToBarber,
            { id: memberId },
          );
        }

        break;
      }
      case "deny":
        await invites.revokeInviteByToken(ctx, { token: args.code });
        break;
      default:
        throw new ConvexError("Respuesta inválida.");
    }
  },
});
