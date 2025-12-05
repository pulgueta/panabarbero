import { errorMessages } from "@panabarbero/constants";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import type { BarbershopMemberWithName } from "./tables";
import { tables } from "./tables";

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
      userId: user.userId ?? "",
      role: "barber",
      uuid: crypto.randomUUID(),
    });

    return barbershopMemberId;
  },
});

export const getBarbersByBarbershopId = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args): Promise<BarbershopMemberWithName[]> => {
    const barbers = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .collect();

    const barbersWithName = await Promise.all(
      barbers.map(async (barber) => {
        const name = await ctx.runQuery(
          internal.userProfileData.getProfileByUserId,
          { userId: barber.userId },
        );

        return {
          ...barber,
          name: name?.name ?? "",
        };
      }),
    );

    return barbersWithName;
  },
});

export const getBarberByUuid = query({
  args: { uuid: v.string() },
  handler: async (ctx, args): Promise<BarbershopMemberWithName | null> => {
    const barbershopMember = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
      .unique();

    if (!barbershopMember) {
      return null;
    }

    const name = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: barbershopMember.userId,
      },
    );

    if (!name) {
      return null;
    }

    return {
      ...barbershopMember,
      name: name.name ?? "",
    };
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

    const barberRecord = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_role", (q) => q.eq("role", "barber"))
      .filter((q) => q.eq(q.field("userId"), args.userId ?? ""))
      .unique();

    return !!barberRecord;
  },
});

export const getBarbershopMemberByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("barbershopMembers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const inviteBarbershopMember = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    barbershopId: v.id("barbershops"),
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

    let userProfile = null;

    if (args.email) {
      userProfile = await ctx.runQuery(
        internal.userProfileData.getProfileByEmail,
        {
          email: args.email,
        },
      );
    }

    if (!userProfile) {
      throw new ConvexError(errorMessages.requiredAccount);
    }

    const userChannels = userProfile.notificationsPreferences
      .filter((n) => n.enabled)
      .map((n) => n.type);

    if (userChannels.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          notification: {
            body: `Hola ${args.name}. Has sido invitado a unirte a ${barbershop.name} como barbero.`,
            title: "Invitación a unirte como barbero",
            receiverUserId: userProfile.userId,
            senderUserId: userInviting.userId,
            uuid: crypto.randomUUID(),
            reason: "barber_invited",
            channels: userChannels,
          },
        },
      );
    }
  },
});
