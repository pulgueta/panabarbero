import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { assertBarberInviteAllowed } from "./acl";
import { authComponent } from "./auth";
import { errorMessages } from "./errors";
import { rateLimitOrThrow } from "./ratelimit";
import { getProfileByEmail, getProfileByUserId } from "./userProfileData";

const INVITATION_EXPIRATION_MS = 1000 * 60 * 60 * 24 * 7;

export const invite = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.string(),
    email: v.string(),
    barbershopId: v.id("barbershops"),
    roles: v.array(v.literal("barber")),
  },
  handler: async (ctx, args) => {
    const userInviting = await authComponent.safeGetAuthUser(ctx);

    if (!userInviting || !userInviting.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "inviteBarbershopMember", userInviting._id);

    const barbershop = await ctx.db.get(args.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    if (barbershop.ownerId !== userInviting.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await assertBarberInviteAllowed(
      ctx,
      args.barbershopId,
      userInviting.userId,
    );

    const email = args.email.toLowerCase().trim();

    const userProfile = await getProfileByEmail(ctx, email);

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
      internal.notifications.createBarberInvited,
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

export const getByCode = query({
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
    const inviterProfile = await getProfileByUserId(
      ctx,
      invitation.inviterUserId,
    );

    return {
      invitation,
      barbershopName: barbershop?.name ?? "",
      inviterName: inviterProfile?.name ?? null,
      isExpired: Date.now() > invitation.expiresAt,
    };
  },
});

export const validate = mutation({
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
      internal.notifications.createBarberInvited,
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

export const answer = mutation({
  args: {
    code: v.string(),
    answer: v.union(v.literal("accept"), v.literal("deny")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user || !user.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "answerInvitation", `${user._id}-${args.code}`);

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

    switch (args.answer) {
      case "accept": {
        if (invitation.expiresAt <= Date.now()) {
          await ctx.db.patch(invitation._id, { status: "expired" });

          throw new ConvexError(
            "La invitación ha expirado. Se ha reenviado un nuevo enlace.",
          );
        }

        const profile = await getProfileByUserId(ctx, user.userId ?? "");

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

        await ctx.db.insert("barbershopMembers", {
          uuid: crypto.randomUUID(),
          barbershopId: invitation.barbershopId,
          userProfileDataId: profile._id,
          roles: invitation.roles,
          isActive: true,
          joinedAt: Date.now(),
        });

        await ctx.db.patch(invitation._id, { status: "accepted" });
        break;
      }
      case "deny":
        await ctx.db.patch(invitation._id, { status: "denied" });
        break;
      default:
        throw new ConvexError("Respuesta inválida.");
    }
  },
});
