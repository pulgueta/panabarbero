/** biome-ignore-all lint/style/noNonNullAssertion: false positive */

import { ConvexError, v } from "convex/values";
import { api, internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { errorMessages } from "./errors";
import type { BarbershopMember } from "./tables";
import { tables } from "./tables";

const INVITATION_EXPIRATION_MS = 1000 * 60 * 60 * 24 * 7;

export const createBarbershopMember = internalMutation({
  args: {
    barbershopMember: v.object({
      ...tables.barbershopMembers,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const barbershopMemberId = await ctx.db.insert("barbershopMembers", {
      ...args.barbershopMember,
      uuid: crypto.randomUUID(),
    });

    return barbershopMemberId;
  },
});

export const getBarbershopMembersByBarbershopId = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .collect();

    const membersWithName = await Promise.all(
      members.map(async (member) => {
        const memberProfile = await ctx.db.get(member.userProfileDataId);

        return {
          ...member,
          name: memberProfile?.name ?? "",
        };
      }),
    );

    return membersWithName;
  },
});

export const getBarberByUuid = query({
  args: { uuid: v.string() },
  handler: async (ctx, args) => {
    const member = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
      .unique();

    return member?.roles.includes("barber") ? member : null;
  },
});

export const updateBarbershopMember = mutation({
  args: {
    barbershopMemberId: v.id("barbershopMembers"),
    barbershopMember: v.object({
      ...tables.barbershopMembers,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const updatedBarbershopMember = await ctx.db.patch(
      args.barbershopMemberId,
      args.barbershopMember,
    );

    return updatedBarbershopMember;
  },
});

export const deleteBarbershopMember = internalMutation({
  args: {
    barbershopMemberId: v.id("barbershopMembers"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const deletedBarbershopMember = await ctx.db.delete(
      args.barbershopMemberId,
    );

    return deletedBarbershopMember;
  },
});

export const isBarber = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.userId) {
      return false;
    }

    const userProfile = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId!))
      .unique();

    if (!userProfile) {
      return false;
    }

    const barbershopMember = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_userProfileDataId", (q) =>
        q.eq("userProfileDataId", userProfile._id),
      )
      .first();

    if (!barbershopMember) return false;

    return barbershopMember.roles.includes("barber");
  },
});

export const getBarbershopMemberByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<BarbershopMember | null> => {
    const userProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: args.userId,
      },
    );

    if (!userProfile?._id) {
      return null;
    }

    const barbershopMember = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_userProfileDataId", (q) =>
        q.eq("userProfileDataId", userProfile._id),
      )
      .first();

    return barbershopMember;
  },
});

export const getBarbershopMemberRolesByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    roles: BarbershopMember["roles"] | undefined;
    isOwner: boolean | undefined;
  }> => {
    const barbershopMember = await ctx.runQuery(
      api.barbershopMembers.getBarbershopMemberByUserId,
      {
        userId: args.userId,
      },
    );

    return {
      roles: barbershopMember?.roles,
      isOwner: barbershopMember?.roles.includes("owner"),
    };
  },
});

export const inviteBarbershopMember = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.string(),
    barbershopId: v.id("barbershops"),
    roles: v.array(
      v.union(v.literal("owner"), v.literal("barber"), v.literal("staff")),
    ),
  },
  handler: async (ctx, args) => {
    const userInviting = await authComponent.safeGetAuthUser(ctx);

    if (!userInviting || !userInviting.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const barbershop = await ctx.db.get(args.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    // Verify the user inviting is the owner of the barbershop
    if (barbershop.ownerId !== userInviting.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const email = args.email.toLowerCase().trim();

    const userProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByEmail,
      { email },
    );

    if (userProfile) {
      const existingMember = await ctx.db
        .query("barbershopMembers")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", args.barbershopId),
        )
        .filter((q) => q.eq(q.field("userProfileDataId"), userProfile._id))
        .unique();

      if (existingMember) {
        throw new ConvexError("Este usuario ya es miembro de la barbería");
      }
    }

    const existingInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .filter((q) => q.eq(q.field("email"), email))
      .first();

    const now = Date.now();

    if (
      existingInvitation &&
      existingInvitation.status === "pending" &&
      existingInvitation.expiresAt > now
    ) {
      throw new ConvexError(
        "Ya existe una invitación activa para este correo.",
      );
    }

    if (existingInvitation && existingInvitation.status === "pending") {
      await ctx.db.patch(existingInvitation._id, { status: "expired" });
    }

    const code = crypto.randomUUID();
    const expiresAt = now + INVITATION_EXPIRATION_MS;

    const invitationId = await ctx.db.insert("invitations", {
      barbershopId: args.barbershopId,
      email,
      phone: args.phone,
      roles: args.roles,
      code,
      status: "pending",
      expiresAt,
      inviterUserId: userInviting.userId,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.notifications.createBarberInvitedNotification,
      {
        invitationId,
        barbershopId: args.barbershopId,
        email,
        code,
        inviterUserId: userInviting.userId,
        roles: args.roles,
        expiresAt,
        phone: args.phone,
      },
    );

    return invitationId;
  },
});

export const getInvitationByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (!invitation) {
      return null;
    }

    const barbershop = await ctx.db.get(invitation.barbershopId);
    const inviterProfile = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", (q) => q.eq("userId", invitation.inviterUserId))
      .unique();

    return {
      invitation,
      barbershopName: barbershop?.name ?? "",
      inviterName: inviterProfile?.name ?? null,
      isExpired: Date.now() > invitation.expiresAt,
    };
  },
});

export const validateInvitation = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (!invitation) {
      throw new ConvexError(errorMessages.notFound("invitación"));
    }

    if (invitation.status !== "pending") {
      return { status: invitation.status };
    }

    const isExpired = invitation.expiresAt <= Date.now();

    if (!isExpired) {
      return { status: "pending" };
    }

    await ctx.db.patch(invitation._id, { status: "expired" });

    const newCode = crypto.randomUUID();
    const expiresAt = Date.now() + INVITATION_EXPIRATION_MS;
    const { _id, _creationTime, ...rest } = invitation;

    const newInvitationId = await ctx.db.insert("invitations", {
      ...rest,
      status: "pending",
      code: newCode,
      expiresAt,
    });

    await ctx.scheduler.runAfter(
      0,
      internal.notifications.createBarberInvitedNotification,
      {
        invitationId: newInvitationId,
        barbershopId: invitation.barbershopId,
        email: invitation.email,
        code: newCode,
        inviterUserId: invitation.inviterUserId,
        roles: invitation.roles,
        expiresAt,
        phone: invitation.phone,
      },
    );

    return { status: "pending" };
  },
});

export const acceptInvitation = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user || !user.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (!invitation) {
      throw new ConvexError(errorMessages.notFound("invitación"));
    }

    if (invitation.status !== "pending") {
      throw new ConvexError("La invitación ya fue gestionada.");
    }

    if (invitation.expiresAt <= Date.now()) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new ConvexError(
        "La invitación ha expirado. Se ha reenviado un nuevo enlace.",
      );
    }

    const profile = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId!))
      .unique();

    if (!profile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    if (profile.email !== invitation.email) {
      throw new ConvexError("Esta invitación no corresponde a tu cuenta.");
    }

    const existingMember = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", invitation.barbershopId),
      )
      .filter((q) => q.eq(q.field("userProfileDataId"), profile._id))
      .first();

    if (existingMember) {
      await ctx.db.patch(invitation._id, { status: "accepted" });
      return existingMember._id;
    }

    const memberId = await ctx.db.insert("barbershopMembers", {
      uuid: crypto.randomUUID(),
      barbershopId: invitation.barbershopId,
      userProfileDataId: profile._id,
      roles: invitation.roles,
      isActive: true,
      joinedAt: Date.now(),
    });

    await ctx.db.patch(invitation._id, { status: "accepted" });

    return memberId;
  },
});

export const denyInvitation = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user || !user.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (!invitation) {
      throw new ConvexError(errorMessages.notFound("invitación"));
    }

    if (invitation.status !== "pending") {
      return invitation.status;
    }

    const profile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      { userId: user.userId },
    );

    if (!profile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    if (profile.email !== invitation.email) {
      throw new ConvexError("Esta invitación no corresponde a tu cuenta.");
    }

    await ctx.db.patch(invitation._id, { status: "denied" });

    return "denied";
  },
});
