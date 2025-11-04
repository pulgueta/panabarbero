import { errorMessages } from "@panabarbero/constants";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import type { Barber } from "./tables";
import { tables } from "./tables";

type BarberWithName = Barber & {
  name: string;
};

export const createBarber = internalMutation({
  args: {
    barber: v.object({
      ...tables.barbers,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const barberId = await ctx.db.insert("barbers", {
      ...args.barber,
      userId: user.userId ?? "",
      uuid: crypto.randomUUID(),
    });

    return barberId;
  },
});

export const getBarbersByBarbershopId = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args): Promise<BarberWithName[]> => {
    const barbers = await ctx.db
      .query("barbers")
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
  handler: async (ctx, args): Promise<BarberWithName | null> => {
    const barber = await ctx.db
      .query("barbers")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
      .unique();

    if (!barber) {
      return null;
    }

    const name = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: barber.userId,
      },
    );

    if (!name) {
      return null;
    }

    return {
      ...barber,
      name: name.name ?? "",
    };
  },
});

export const updateBarber = mutation({
  args: {
    barberId: v.id("barbers"),
    barber: v.object({
      ...tables.barbers,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const updatedBarber = await ctx.db.patch(args.barberId, args.barber);

    return updatedBarber;
  },
});

export const deleteBarber = internalMutation({
  args: {
    barberId: v.id("barbers"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const deletedBarber = await ctx.db.delete(args.barberId);

    return deletedBarber;
  },
});

export const isBarber = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return false;
    }

    if (user.userId !== args.userId) {
      return false;
    }

    const barberRecord = await ctx.db
      .query("barbers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId ?? ""))
      .unique();

    return !!barberRecord;
  },
});

export const inviteBarber = mutation({
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

    const userChannels = userProfile.notificationsPreferences.map(
      (n) => n.type,
    );

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
