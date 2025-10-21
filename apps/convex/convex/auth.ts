import { expo } from "@better-auth/expo";
import type { AuthFunctions, GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { passkey } from "better-auth/plugins/passkey";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";

const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: async (ctx, doc) => {
        await ctx.runMutation(internal.userProfileData.createProfile, {
          data: {
            userId: doc.userId as string,
            uuid: crypto.randomUUID(),
            email: doc.email,
            phoneNumber: doc.phoneNumber ?? undefined,
            notificationsPreferences: [
              {
                type: "push",
                enabled: false,
              },
              {
                type: "sms",
                enabled: false,
              },
            ],
          },
        });
      },
      onDelete: async (ctx, doc) => {
        const profile = await ctx.runQuery(
          internal.userProfileData.getProfileByUserId,
          {
            userId: doc.userId ?? "",
          },
        );

        if (!profile) {
          throw new Error("Profile not found", {
            cause: doc.userId,
          });
        }

        await ctx.runMutation(internal.userProfileData.deleteProfile, {
          profileId: profile._id,
        });
      },
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

const siteUrl = process.env.SITE_URL ?? "";
const previewSiteUrl = process.env.PREVIEW_SITE_URL ?? "";

export const createAuth = (
  ctx: GenericCtx<DataModel>,
  { optionsOnly } = { optionsOnly: false },
) => {
  return betterAuth({
    logger: {
      disabled: optionsOnly,
    },
    trustedOrigins: ["panabarbero://", siteUrl, previewSiteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        enabled: true,
      },
    },
    plugins: [expo(), convex(), crossDomain({ siteUrl }), passkey()],
  });
};

export const getAuthUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.getAuthUser(ctx);
  },
});

export const checkIsBarber = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user || !user.userId) {
      return { isBarber: false as const };
    }

    const userId = user.userId;

    const barberRecords = await ctx.db
      .query("barbers")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (barberRecords.length === 0) {
      return { isBarber: false as const };
    }

    const barbershops = await Promise.all(
      barberRecords.map(async (barber) => {
        const barbershop = await ctx.db.get(barber.barbershopId);

        if (!barbershop) return null;

        return {
          _id: barbershop._id,
          uuid: barbershop.uuid,
          name: barbershop.name,
        };
      }),
    );

    const validBarbershops = barbershops.filter((b) => b !== null);

    return {
      isBarber: true as const,
      barbershops: validBarbershops,
    };
  },
});
